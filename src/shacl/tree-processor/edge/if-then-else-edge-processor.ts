import { match, P } from 'ts-pattern';
import { Edge } from '../../../graph/types';
import { SHACL_AND, SHACL_NOT, SHACL_OR } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class IfThenElseEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly resolver: EdgeResolver
  ) {}

  process(edges: Edge[], subject: string, isBlank: boolean): void {
    const ifEdge = edges.find((e) => e.label === 'if');
    const thenEdge = edges.find((e) => e.label === 'then');
    const elseEdge = edges.find((e) => e.label === 'else');

    if (!ifEdge || (!thenEdge && !elseEdge)) return;

    const ifResolved = this.resolver.resolveEdgeToShapeId(ifEdge);
    if (!ifResolved) return;

    const thenResolved = thenEdge ? this.resolver.resolveEdgeToShapeId(thenEdge) : null;
    const elseResolved = elseEdge ? this.resolver.resolveEdgeToShapeId(elseEdge) : null;

    match([thenResolved, elseResolved])
      .with([P.not(P.nullish), P.nullish], ([then_]) => {
        this.emitOrWithNot(ifResolved.id, then_.id, subject, isBlank);
      })
      .with([P.nullish, P.not(P.nullish)], ([, else_]) => {
        this.context.store.listOfBlanks(subject, SHACL_OR, [ifResolved.id, else_.id], isBlank);
      })
      .with([P.not(P.nullish), P.not(P.nullish)], ([then_, else_]) => {
        const notOrBlankId = this.context.nextBlankId();
        this.emitOrWithNot(ifResolved.id, then_.id, notOrBlankId, true);

        const ifOrBlankId = this.context.nextBlankId();
        this.context.store.listOfBlanks(ifOrBlankId, SHACL_OR, [ifResolved.id, else_.id], true);

        this.context.store.listOfBlanks(subject, SHACL_AND, [notOrBlankId, ifOrBlankId], isBlank);
      })
      .otherwise(() => {
        /* empty */
      });
  }

  private emitOrWithNot(
    notTargetId: string,
    thenId: string,
    subject: string,
    isBlank: boolean
  ): void {
    const notWrapperBlankId = this.context.nextBlankId();
    this.context.store.bothBlank(notWrapperBlankId, SHACL_NOT, notTargetId);
    this.context.store.listOfBlanks(subject, SHACL_OR, [notWrapperBlankId, thenId], isBlank);
  }
}
