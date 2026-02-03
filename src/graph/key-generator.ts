const ROOT_RELATIVE_LABELS = new Set(['$defs', 'definitions']);

export class KeyGenerator {
  forRecord(parentKey: string, label: string, propertyKey: string): string {
    if (ROOT_RELATIVE_LABELS.has(label)) {
      return `${label}/${propertyKey}`;
    }
    return `${parentKey}/${label}/${propertyKey}`;
  }

  forArrayItem(parentKey: string, label: string, index: number): string {
    return `${parentKey}/${label}/${String(index)}`;
  }

  forValue(parentKey: string, label: string): string {
    return `${parentKey}/${label}`;
  }
}
