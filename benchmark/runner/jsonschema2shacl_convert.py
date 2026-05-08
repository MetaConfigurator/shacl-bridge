"""Helper script called by the benchmark runner.

Usage: python3 jsonschema2shacl_convert.py <input.json> <output.ttl>
"""
import sys

from jsonschema2shacl.file_parser import parse_json_schema
from jsonschema2shacl.json_schema_to_shacl import JsonSchemaToShacl


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 jsonschema2shacl_convert.py <input.json> <output.ttl>", file=sys.stderr)
        sys.exit(1)

    schema = parse_json_schema(sys.argv[1])
    converter = JsonSchemaToShacl()
    converter.translate(schema)
    converter.shacl.serialize(format="turtle", destination=sys.argv[2])


if __name__ == "__main__":
    main()
