import { SchemaEdge } from '../../../tree/types';
import { SHACL_AND, SHACL_NOT, SHACL_OR } from '../../shacl-terms';
import { WriterContext } from '../../writer/writer-context';
import { EdgeProcessor } from './edge-processor';
import { EdgeResolver } from './edge-resolver';

export class IfThenElseEdgeProcessor implements EdgeProcessor {
  constructor(
    private readonly context: WriterContext,
    private readonly resolver: EdgeResolver
  ) {}

  process(edges: SchemaEdge[], subject: string, isBlank: boolean): void {
    const ifEdge = edges.find((e) => e.label === 'if');
    const thenEdge = edges.find((e) => e.label === 'then');
    const elseEdge = edges.find((e) => e.label === 'else');

    if (!ifEdge || (!thenEdge && !elseEdge)) return;

    const ifResolved = this.resolver.resolveEdgeToShapeId(ifEdge);
    if (!ifResolved) return;

    const thenResolved = thenEdge ? this.resolver.resolveEdgeToShapeId(thenEdge) : null;
    const elseResolved = elseEdge ? this.resolver.resolveEdgeToShapeId(elseEdge) : null;

    if (thenResolved && !elseResolved) {
      this.emitOrWithNot(ifResolved.id, thenResolved.id, subject, isBlank);
    } else if (!thenResolved && elseResolved) {
      this.context.store.listOfBlanks(subject, SHACL_OR, [ifResolved.id, elseResolved.id], isBlank);
    } else if (thenResolved && elseResolved) {
      const notOrBlankId = this.context.nextBlankId();
      this.emitOrWithNot(ifResolved.id, thenResolved.id, notOrBlankId, true);

      const ifOrBlankId = this.context.nextBlankId();
      this.context.store.listOfBlanks(
        ifOrBlankId,
        SHACL_OR,
        [ifResolved.id, elseResolved.id],
        true
      );

      this.context.store.listOfBlanks(subject, SHACL_AND, [notOrBlankId, ifOrBlankId], isBlank);
    }
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
