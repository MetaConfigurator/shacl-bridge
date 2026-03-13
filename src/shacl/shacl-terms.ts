export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
export const RDF_FIRST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#first';
export const RDF_REST = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#rest';
export const RDF_NIL = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#nil';
export const SHACL_NODE_SHAPE = 'http://www.w3.org/ns/shacl#NodeShape';
export const SHACL_PROPERTY_SHAPE = 'http://www.w3.org/ns/shacl#PropertyShape';
export const SHACL_PATH = 'http://www.w3.org/ns/shacl#path';
export const SHACL_PROPERTY = 'http://www.w3.org/ns/shacl#property';
export const SHACL_DATATYPE = 'http://www.w3.org/ns/shacl#datatype';
export const SHACL_TARGET_CLASS = 'http://www.w3.org/ns/shacl#targetClass';
export const SHACL_TARGET_NODE = 'http://www.w3.org/ns/shacl#targetNode';
export const SHACL_TARGET_SUBJECTS_OF = 'http://www.w3.org/ns/shacl#targetSubjectsOf';
export const SHACL_TARGET_OBJECTS_OF = 'http://www.w3.org/ns/shacl#targetObjectsOf';
export const SHACL_NAME = 'http://www.w3.org/ns/shacl#name';
export const SHACL_IGNORED_PROPERTIES = 'http://www.w3.org/ns/shacl#ignoredProperties';
export const SHACL_CLOSED = 'http://www.w3.org/ns/shacl#closed';
export const SHACL_NODE = 'http://www.w3.org/ns/shacl#node';
export const SHACL_OR = 'http://www.w3.org/ns/shacl#or';
export const SHACL_AND = 'http://www.w3.org/ns/shacl#and';
export const SHACL_NOT = 'http://www.w3.org/ns/shacl#not';
export const SHACL_XONE = 'http://www.w3.org/ns/shacl#xone';
export const SHACL_MIN_COUNT = 'http://www.w3.org/ns/shacl#minCount';
export const SHACL_MAX_COUNT = 'http://www.w3.org/ns/shacl#maxCount';
export const SHACL_MIN_LENGTH = 'http://www.w3.org/ns/shacl#minLength';
export const SHACL_MAX_LENGTH = 'http://www.w3.org/ns/shacl#maxLength';
export const SHACL_PATTERN = 'http://www.w3.org/ns/shacl#pattern';
export const SHACL_NODE_KIND = 'http://www.w3.org/ns/shacl#nodeKind';
export const SHACL_IRI = 'http://www.w3.org/ns/shacl#IRI';
export const SHACL_CLASS = 'http://www.w3.org/ns/shacl#class';
export const SHACL_MIN_INCLUSIVE = 'http://www.w3.org/ns/shacl#minInclusive';
export const SHACL_MAX_INCLUSIVE = 'http://www.w3.org/ns/shacl#maxInclusive';
export const SHACL_MIN_EXCLUSIVE = 'http://www.w3.org/ns/shacl#minExclusive';
export const SHACL_MAX_EXCLUSIVE = 'http://www.w3.org/ns/shacl#maxExclusive';
export const SHACL_SEVERITY = 'http://www.w3.org/ns/shacl#severity';
export const SHACL_WARNING = 'http://www.w3.org/ns/shacl#Warning';
export const SHACL_DEACTIVATED = 'http://www.w3.org/ns/shacl#deactivated';
export const SHACL_MESSAGE = 'http://www.w3.org/ns/shacl#message';
export const SHACL_QUALIFIED_VALUE_SHAPE = 'http://www.w3.org/ns/shacl#qualifiedValueShape';
export const SHACL_QUALIFIED_MIN_COUNT = 'http://www.w3.org/ns/shacl#qualifiedMinCount';
export const SHACL_QUALIFIED_MAX_COUNT = 'http://www.w3.org/ns/shacl#qualifiedMaxCount';
export const SHACL_UNIQUE_LANG = 'http://www.w3.org/ns/shacl#uniqueLang';
export const SHACL_HAS_VALUE = 'http://www.w3.org/ns/shacl#hasValue';
export const SHACL_LANGUAGE_IN = 'http://www.w3.org/ns/shacl#languageIn';
export const SHACL_IN = 'http://www.w3.org/ns/shacl#in';
export const SHACL_DESCRIPTION = 'http://www.w3.org/ns/shacl#description';
export const SHACL_BLANK_NODE_OR_IRI = 'http://www.w3.org/ns/shacl#BlankNodeOrIRI';
export const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';
export const XSD_BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean';
export const XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer';
export const XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal';
export const XSD_DATE_TIME = 'http://www.w3.org/2001/XMLSchema#dateTime';
export const XSD_DATE = 'http://www.w3.org/2001/XMLSchema#date';
export const XSD_TIME = 'http://www.w3.org/2001/XMLSchema#time';
export const FOAF_PERSON = 'http://xmlns.com/foaf/0.1/Person';

export const SHACL_ZERO_OR_MORE_PATH = 'http://www.w3.org/ns/shacl#zeroOrMorePath';
export const SHACL_ONE_OR_MORE_PATH = 'http://www.w3.org/ns/shacl#oneOrMorePath';
export const SHACL_ZERO_OR_ONE_PATH = 'http://www.w3.org/ns/shacl#zeroOrOnePath';
export const SHACL_INVERSE_PATH = 'http://www.w3.org/ns/shacl#inversePath';
export const SHACL_ALTERNATIVE_PATH = 'http://www.w3.org/ns/shacl#alternativePath';

export const DEFAULT_PREFIXES: Record<string, string> = {
  sh: 'http://www.w3.org/ns/shacl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};

export const DEFAULT_BASE = 'http://example.org/';
