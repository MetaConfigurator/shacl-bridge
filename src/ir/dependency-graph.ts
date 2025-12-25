import { Index } from './indexer';
import { BlankNode, DefaultGraph, Literal, NamedNode, Quad, Term, Util, Variable } from 'n3';
import { ShaclDocument } from '../shacl/shacl-document';
import { CycleDetector } from './cycle-detector';
import isBlankNode = Util.isBlankNode;

export interface DependencyGraph {
  dependencies: Map<Term, Set<Term>>;
  dependents: Map<Term, Set<Term>>;
  cycles: Map<Term, Set<BlankNode>>;
}

export class DependencyGraphBuilder {
  private graph: DependencyGraph = {
    dependencies: new Map<Term, Set<Term>>(),
    dependents: new Map<BlankNode, Set<Term>>(),
    cycles: new Map<Term, Set<BlankNode>>(),
  };
  private termCache = new Map<string, Term>();

  constructor(
    private readonly index: Index,
    private readonly shaclDocument: ShaclDocument
  ) {}

  build(): DependencyGraph {
    const { quads, blanks } = this.index;
    const lists = this.shaclDocument.lists;

    // First pass: Build dependency and dependent relationships
    quads.forEach((quads, subject) => {
      this.findDependenciesForSubject(quads, this.getCanonicalTerm(subject), lists, blanks);
    });

    // Second pass: Detect cycles using DFS
    this.detectCycles();

    return this.graph;
  }

  private getCanonicalTerm(term: Term): Term {
    const key = term.value;
    const cached = this.termCache.get(key);
    if (cached) {
      return cached;
    }
    this.termCache.set(key, term);
    return term;
  }

  private findDependenciesForSubject(
    quads: Quad[],
    subject: Term,
    lists: Record<string, Term[]>,
    blanks: BlankNode[]
  ) {
    const dependenciesForSubject: Set<Term> = new Set<Term>();
    // Get all blank node dependencies for this subject (including list head nodes)
    this.addBlankNodeDependencies(quads, blanks, dependenciesForSubject, subject);
    // Additionally, extract blank nodes from RDF list values (if any)
    this.addListDependencies(quads, lists, blanks, dependenciesForSubject, subject);
    if (dependenciesForSubject.size > 0)
      this.graph.dependencies.set(subject, dependenciesForSubject);
  }

  private addListDependencies(
    quads: Quad[],
    lists: Record<string, Term[]>,
    blanks: BlankNode[],
    dependenciesForSubject: Set<Term>,
    subject: NamedNode | BlankNode | Literal | Variable | DefaultGraph
  ) {
    quads
      .filter((quad) => quad.object.value in lists && lists[quad.object.value].length > 0)
      .map((quad) => lists[quad.object.value])
      .flat(1)
      .filter((term) => isBlankNode(term))
      .filter((term) => blanks.map((b) => b.value).includes(term.value))
      .map((term) => this.getCanonicalTerm(term))
      .forEach((canonicalTerm) => {
        this.resolveDependency(dependenciesForSubject, canonicalTerm, subject);
      });
  }

  private addBlankNodeDependencies(
    quads: Quad[],
    blanks: BlankNode[],
    dependenciesForSubject: Set<Term>,
    subject: NamedNode | BlankNode | Literal | Variable | DefaultGraph
  ) {
    quads
      .filter((quad) => isBlankNode(quad.object))
      .filter((quad) => blanks.map((b) => b.value).includes(quad.object.value))
      .map((quad) => this.getCanonicalTerm(quad.object))
      .forEach((canonicalTerm) => {
        this.resolveDependency(dependenciesForSubject, canonicalTerm, subject);
      });
  }

  private resolveDependency(
    dependenciesForSubject: Set<Term>,
    canonicalTerm: NamedNode | BlankNode | Literal | Variable | DefaultGraph,
    subject: NamedNode | BlankNode | Literal | Variable | DefaultGraph
  ) {
    if (!dependenciesForSubject.has(canonicalTerm)) {
      dependenciesForSubject.add(canonicalTerm);
      if (!this.graph.dependents.has(canonicalTerm)) {
        this.graph.dependents.set(canonicalTerm, new Set<Term>());
      }
      this.graph.dependents.get(canonicalTerm)?.add(subject);
    }
  }

  private detectCycles(): void {
    const detector = new CycleDetector(this.graph.dependencies);
    this.graph.cycles = detector.detect();
  }
}
