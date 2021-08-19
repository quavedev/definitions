import { getSettings } from 'meteor/quave:settings';

const PACKAGE_NAME = 'quave:definitions';
const settings = getSettings({ packageName: PACKAGE_NAME });

const { isVerbose } = settings;

const getTypeName = value => {
  if (value.graphQLType) {
    return value.graphQLType;
  }
  if (value.type instanceof String) {
    return value.type;
  }
  if (value.type instanceof Number) {
    return 'Float';
  }
  if (value.type.name) {
    return typeof value.type.name === 'function'
      ? value.type.name()
      : value.type.name === 'Number'
      ? 'Float'
      : value.type.name;
  }
  const stringType = value.type.toString();
  if (stringType === 'SimpleSchema.Integer') {
    return 'Int';
  }
  throw new Error(
    `'type' ${value.type} is not supported. Use 'graphQLType' as string instead.`
  );
};

const isDbOnly = ({ dbOnly }) => !!dbOnly;

const getFieldsDefinitions = ({ fields, isInput = false }) =>
  Object.entries(fields)
    .filter(([, value]) => !isDbOnly(value))
    .map(([key, value]) => {
      const isOptional =
        value.optional || (isInput && value.graphQLOptionalInput) ? '' : '!';
      return `${key}: ${getTypeName(value)}${isOptional}`;
    })
    .join('\n  ');

const getFieldsNames = ({ fields }) =>
  Object.entries(fields)
    .filter(([, value]) => !isDbOnly(value))
    .map(([key]) => key)
    .join('\n  ');

const definitionToInputDef = ({ name, fields }) => `input ${name}Input {
  _id: ID
  ${getFieldsDefinitions({
    fields,
    isInput: true,
  })}
}`;

const definitionToEnumDef = ({ name, options }) => `enum ${name} {
  ${Object.keys(options).join('\n  ')}
}`;

const definitionToTypeDef = ({ name, fields }) => `type ${name} {
    _id: ID!
    ${getFieldsDefinitions({ fields })}
  }`;

const definitionToFragment = ({
  name,
  fields,
}) => `fragment ${name}Full on ${name} {
  _id
  ${getFieldsNames({ fields })}
}`;

// removes fields that are not part of SimpleSchema
const definitionToSimpleSchema = definition =>
  Object.entries(definition.fields).reduce(
    (
      acc,
      [
        fieldName,
        {
          graphQLType,
          graphQLOptionalInput,
          typeName,
          customType,
          dbOnly,
          ...item
        },
      ]
    ) => ({
      ...acc,
      [fieldName]: {
        ...item,
        ...(item.type.toSimpleSchema
          ? { type: item.type.toSimpleSchema() }
          : {}),
      },
    }),
    {}
  );

const toCamelCase = text =>
  `${text.charAt(0).toLowerCase()}${text.substring(1)}`;

const getNameCamelCase = definition => toCamelCase(definition.name);
const getPluralName = definition =>
  definition.pluralName || `${definition.name}s`;
const getPluralNameCamelCase = definition =>
  toCamelCase(getPluralName(definition));

const v = result => {
  if (isVerbose) {
    // eslint-disable-next-line no-console
    console.log(PACKAGE_NAME);
    // eslint-disable-next-line no-console
    console.log(result);
  }
  return result;
};
export const createModelDefinition = definition => {
  const { name } = definition;
  const nameCamelCase = getNameCamelCase(definition);
  const pluralNameCamelCase = getPluralNameCamelCase(definition);
  const pluralName = getPluralName(definition);

  const toSimpleSchema = () => {
    import SimpleSchema from 'simpl-schema';

    return new SimpleSchema(definitionToSimpleSchema(definition));
  };
  const toGraphQLFragment = () => definitionToFragment(definition);
  const toGraphQLType = () => definitionToTypeDef(definition);
  const toGraphQLInput = () => definitionToInputDef(definition);
  const fullFragment = toGraphQLFragment();
  const paginationFragments = `
    fragment PaginationActionFull on PaginationAction {
      skip
      limit
    }
    
    fragment PaginationFull on Pagination {
      total
      currentPage
      totalPages
      previous {
        ...PaginationActionFull
      }
      next {
        ...PaginationActionFull
      }
      first {
        ...PaginationActionFull
      }
      last {
        ...PaginationActionFull
      }
    }
  `;

  const fullFragmentName = `${name}Full`;
  const graphQLOneQueryName = name;
  const graphQLManyQueryName = pluralName;
  const graphQLPaginatedQueryName = `${pluralName}Paginated`;
  const graphQLSaveMutationName = `Save${name}`;
  const graphQLEraseMutationName = `Erase${name}`;
  const graphQLOneQueryCamelCaseName = toCamelCase(graphQLOneQueryName);
  const graphQLManyQueryCamelCaseName = toCamelCase(graphQLManyQueryName);
  const graphQLPaginatedQueryCamelCaseName = toCamelCase(
    graphQLPaginatedQueryName
  );
  const graphQLSaveMutationCamelCaseName = toCamelCase(graphQLSaveMutationName);
  const graphQLEraseMutationCamelCaseName = toCamelCase(
    graphQLEraseMutationName
  );

  const toGraphQLPaginatedType = () => `
      type ${graphQLPaginatedQueryName} {
        pagination: Pagination
        items: [${name}]
      }
  `;
  const toGraphQLQueries = () => `
        type Query {
          ${graphQLOneQueryCamelCaseName}(_id: ID!): ${name}
          ${graphQLManyQueryCamelCaseName}: [${name}]
          ${graphQLPaginatedQueryCamelCaseName}(paginationAction: PaginationActionInput): ${graphQLPaginatedQueryName}
        }      
      `;
  const toGraphQLMutations = () => `
        type Mutation {
          ${graphQLSaveMutationCamelCaseName}(${nameCamelCase}: ${name}Input!): ${name}
          ${graphQLEraseMutationCamelCaseName}(_id: ID!): ${name}
        }      
      `;
  const toGraphQLOneQuery = () => `
      query ${graphQLOneQueryName}($_id: ID!) {
        ${graphQLOneQueryCamelCaseName}(_id: $_id) {
          ...${fullFragmentName}
        }
      }
      ${fullFragment}
    `;
  const toGraphQLManyQuery = () => `
      query ${graphQLManyQueryName} {
        ${graphQLManyQueryCamelCaseName} {
          ...${fullFragmentName}
        }
      }
      ${fullFragment}
    `;
  const toGraphQLPaginatedQuery = () => `
      query ${graphQLPaginatedQueryName}($paginationAction: PaginationActionInput) {
        ${graphQLPaginatedQueryCamelCaseName}(paginationAction: $paginationAction) {
          pagination {
            ...PaginationFull
          }
          items {
            ...${fullFragmentName}
          }
        }
      }
      ${paginationFragments}
      ${fullFragment}
    `;
  const toGraphQLSaveMutation = () => `
      mutation ${graphQLSaveMutationName}($${nameCamelCase}: ${name}Input!) {
        save${name}(${nameCamelCase}: $${nameCamelCase}) {
          ...${fullFragmentName}
        }
      }
      ${fullFragment}
    `;
  const toGraphQLEraseMutation = () => `
      mutation ${graphQLEraseMutationName}($_id: ID!) {
        ${graphQLEraseMutationCamelCaseName}(_id: $_id) {
          ...${fullFragmentName}
        }
      }
      ${fullFragment}
    `;
  const toGraphQL = () =>
    v(`    
      ${commonTypeDefs}
      ${toGraphQLPaginatedType()}
      ${toGraphQLType(definition)}
      ${toGraphQLInput(definition)}
      ${toGraphQLFragment(definition)}
      ${toGraphQLQueries(definition)}
      ${toGraphQLMutations(definition)}
    `);
  const fields = Object.entries(definition.fields).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: Object.assign(value, {
        typeName: getTypeName(value),
        customType: value.type,
      }),
    }),
    {}
  );

  const assignFields = newFields =>
    createModelDefinition({
      ...definition,
      fields: Object.assign({}, fields, newFields),
    });

  return {
    rawDefinition: definition,
    fields,
    name,
    pluralName,
    nameCamelCase,
    pluralNameCamelCase,
    fullFragmentName,
    graphQLOneQueryName,
    graphQLManyQueryName,
    graphQLPaginatedQueryName,
    graphQLSaveMutationName,
    graphQLEraseMutationName,
    graphQLOneQueryCamelCaseName,
    graphQLManyQueryCamelCaseName,
    graphQLPaginatedQueryCamelCaseName,
    graphQLSaveMutationCamelCaseName,
    graphQLEraseMutationCamelCaseName,
    assignFields,
    toSimpleSchema,
    toGraphQLFragment,
    toGraphQLType,
    toGraphQLInput,
    toGraphQLQueries,
    toGraphQLMutations,
    toGraphQL,
    toGraphQLManyQuery,
    toGraphQLPaginatedQuery,
    toGraphQLOneQuery,
    toGraphQLSaveMutation,
    toGraphQLEraseMutation,
  };
};

export const createEnumDefinition = definition => {
  const allowedValues = () => Object.keys(definition.options);
  const { name } = definition;
  const toSimpleSchemaField = () => ({
    type: String,
    allowedValues: allowedValues(),
    graphQLType: name,
  });
  const toGraphQLEnum = () => definitionToEnumDef(definition);
  const toGraphQL = () => v(toGraphQLEnum(definition));
  const toEnum = () =>
    Object.entries(definition.options).reduce(
      (acc, [key, value]) => ({
        ...acc,
        // to keep methods in the object
        [key]: Object.assign(value, { value: key }),
      }),
      {}
    );
  return {
    rawDefinition: definition,
    options: definition.options,
    name,
    allowedValues,
    toSimpleSchemaField,
    toGraphQLEnum,
    toGraphQL,
    toEnum,
  };
};

export const commonTypeDefs = `
  input PaginationActionInput {
    skip: Int
    limit: Int
  }
  
  type PaginationAction {
    skip: Int
    limit: Int
  }
  
  type Pagination {
    previous: PaginationAction
    next: PaginationAction
    first: PaginationAction
    last: PaginationAction
    total: Int!
    currentPage: Int!
    totalPages: Int!
  }
`;
