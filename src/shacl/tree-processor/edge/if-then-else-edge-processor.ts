import { SchemaEdge } from '../../../tree/types';
import { SHACL_AND, SHACL_NOT, SHACL_OR } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { ChildNode, EdgeContext, EdgeProcessor } from './edge-processor';
import { EdgeResolver, ResolvedEdge } from './edge-resolver';

export class IfThenElseEdgeProcessor implements EdgeProcessor {
  private readonly resolver: EdgeResolver;

  constructor(private readonly context: WriterContext) {
    this.resolver = new EdgeResolver(context);
  }

  filter(edges: SchemaEdge[]): SchemaEdge[] {
    return edges.filter((e) => e.label === 'if' || e.label === 'then' || e.label === 'else');
  }

  process({ edges, subject, isBlank }: EdgeContext): ChildNode[] {
    if (subject == null) return [];
    const ifEdge = edges.find((e) => e.label === 'if');
    const thenEdge = edges.find((e) => e.label === 'then');
    const elseEdge = edges.find((e) => e.label === 'else');

    if (!ifEdge || (!thenEdge && !elseEdge)) return [];

    const ifResolved = this.resolver.resolveEdgeToShapeId(ifEdge);

    const thenResolved = thenEdge ? this.resolver.resolveEdgeToShapeId(thenEdge) : null;
    const elseResolved = elseEdge ? this.resolver.resolveEdgeToShapeId(elseEdge) : null;

    const children: ChildNode[] = [];

    if (thenResolved && !elseResolved) {
      children.push(...this.emitOrWithNot(ifResolved, thenResolved, subject, isBlank ?? false));
    } else if (!thenResolved && elseResolved) {
      this.context.store.listOfBlanks(subject, SHACL_OR, [ifResolved.id, elseResolved.id], isBlank);
      children.push(...this.collectChildren(ifResolved, elseResolved));
    } else if (thenResolved && elseResolved) {
      const notOrBlankId = this.context.nextBlankId();
      children.push(...this.emitOrWithNot(ifResolved, thenResolved, notOrBlankId, true));

      const ifOrBlankId = this.context.nextBlankId();
      this.context.store.listOfBlanks(
        ifOrBlankId,
        SHACL_OR,
        [ifResolved.id, elseResolved.id],
        true
      );
      children.push(...this.collectChildren(ifResolved, elseResolved));

      this.context.store.listOfBlanks(subject, SHACL_AND, [notOrBlankId, ifOrBlankId], isBlank);
    }

    return children;
  }

  private emitOrWithNot(
    notTarget: ResolvedEdge,
    then: ResolvedEdge,
    subject: string,
    isBlank: boolean
  ): ChildNode[] {
    const notWrapperBlankId = this.context.nextBlankId();
    this.context.store.bothBlank(notWrapperBlankId, SHACL_NOT, notTarget.id);
    this.context.store.listOfBlanks(subject, SHACL_OR, [notWrapperBlankId, then.id], isBlank);
    return this.collectChildren(notTarget, then);
  }

  private collectChildren(...resolved: ResolvedEdge[]): ChildNode[] {
    return resolved.flatMap((r) => (r.child ? [r.child] : []));
  }
}
