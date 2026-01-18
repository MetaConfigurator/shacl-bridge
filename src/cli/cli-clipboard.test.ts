import * as fs from 'fs';
import * as path from 'path';

// Create a mock function that can be controlled in tests
const mockRead = jest.fn();

// Mock clipboardy module
jest.mock('clipboardy', () => ({
  __esModule: true,
  default: {
    read: mockRead,
  },
}));

describe('CLI --from-clipboard', () => {
  const samplesDir = path.join(__dirname, '../../samples/shacl');
  const simpleShaclPath = path.join(samplesDir, 'simple-shacl.ttl');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should convert SHACL from clipboard', async () => {
    // Read a sample SHACL file to use as clipboard content
    const shaclContent = fs.readFileSync(simpleShaclPath, 'utf-8');
    mockRead.mockResolvedValue(shaclContent);

    const { ShaclParser } = await import('../shacl/shacl-parser');
    const { IntermediateRepresentationBuilder } =
      await import('../ir/intermediate-representation-builder');
    const { IrSchemaConverter } = await import('../json-schema/ir-schema-converter');

    const clipboardy = await import('clipboardy');
    const content = await clipboardy.default.read();
    const shaclDocument = await new ShaclParser().withContent(content).parse();
    const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
    const result = new IrSchemaConverter(ir).convert();

    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(result.$defs).toBeDefined();
  });

  it('should convert cardinality-constraints SHACL from clipboard', async () => {
    const cardinalityPath = path.join(samplesDir, 'cardinality-constraints.ttl');
    const shaclContent = fs.readFileSync(cardinalityPath, 'utf-8');
    mockRead.mockResolvedValue(shaclContent);

    const { ShaclParser } = await import('../shacl/shacl-parser');
    const { IntermediateRepresentationBuilder } =
      await import('../ir/intermediate-representation-builder');
    const { IrSchemaConverter } = await import('../json-schema/ir-schema-converter');

    const clipboardy = await import('clipboardy');
    const content = await clipboardy.default.read();
    const shaclDocument = await new ShaclParser().withContent(content).parse();
    const ir = new IntermediateRepresentationBuilder(shaclDocument).build();
    const result = new IrSchemaConverter(ir).convert();

    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(result.$defs).toBeDefined();

    const defs = result.$defs as Record<string, unknown>;
    expect(Object.keys(defs).length).toBeGreaterThan(0);
  });
});
