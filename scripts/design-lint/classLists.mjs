// Where class lists are in the code, and how one class is read. Shared by the
// rules that look at Tailwind classes: a class list is a JSX `className`, an
// argument of `cx`, or a value inside `defineRecipe` / `defineSlotRecipe`
// (`base`, `slots`, `variants`, and the `class` of a compound variant; never
// `defaultVariants`, whose values are variant names). An identifier in a class
// position is followed to the string it was declared with in the same file, so
// `const CARD = "…"; cx(CARD, …)` is checked once, at the declaration. A list
// built from anything else at runtime is checked only where it is literal:
// the rules never guess.

/** Functions whose arguments are class lists. */
const CLASS_CALLEES = new Set(["cx"]);
/** Functions whose first argument is a recipe definition. */
const RECIPE_CALLEES = new Set(["defineRecipe", "defineSlotRecipe"]);
/** Recipe keys whose values are class lists (recursively for `variants` and `slots`). */
const RECIPE_CLASS_KEYS = new Set(["base", "class", "className"]);

/**
 * @typedef {Object} ClassGroup one class position: the strings that style one element together
 * @property {import("estree").Node[]} nodes string and template literal nodes
 * @property {string | undefined} element the JSX element the group styles, when it is a `className`
 */

/**
 * @typedef {Object} ParsedClass
 * @property {string} raw the class as written
 * @property {string[]} variants the variants before the base, in order (`enabled`, `hover`, `[&_svg]`)
 * @property {string} base the utility, without variants, `!` and the leading `-`
 * @property {boolean} negative
 * @property {string | undefined} modifier the `/60` opacity or `/menu` group name, when present
 */

/**
 * Splits a class into its variants and base. Colons inside `[…]` and `(…)` are
 * part of an arbitrary variant or value, not separators.
 * @param {string} raw
 * @returns {ParsedClass}
 */
export function parseClass(raw) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) {
      parts.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(raw.slice(start));
  let base = parts.pop() ?? "";
  let negative = false;
  if (base.startsWith("!")) base = base.slice(1);
  if (base.startsWith("-")) {
    negative = true;
    base = base.slice(1);
  }
  let modifier;
  const slash = modifierIndex(base);
  if (slash !== -1) {
    modifier = base.slice(slash + 1);
    base = base.slice(0, slash);
  }
  return { raw, variants: parts, base, negative, modifier };
}

/** The index of a `/` outside brackets, or -1. */
function modifierIndex(base) {
  let depth = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === "/" && depth === 0) return i;
  }
  return -1;
}

/**
 * The classes of a string, with the offset of each in it.
 * @param {string} text
 * @returns {{ parsed: ParsedClass, start: number, end: number }[]}
 */
export function classesOf(text) {
  const classes = [];
  for (const match of text.matchAll(/\S+/g)) {
    classes.push({ parsed: parseClass(match[0]), start: match.index, end: match.index + match[0].length });
  }
  return classes;
}

/**
 * The string pieces of a class-list node: a literal's value, or each quasi of
 * a template. Each piece knows how to replace one class in the source.
 * @param {import("estree").Node} node
 * @param {import("eslint").SourceCode} sourceCode
 * @returns {{ text: string, replace: (fixer: import("eslint").Rule.RuleFixer, start: number, end: number, next: string) => import("eslint").Rule.Fix | null }[]}
 */
export function piecesOf(node, sourceCode) {
  if (node.type === "Literal" && typeof node.value === "string") {
    const text = node.value;
    const raw = sourceCode.getText(node);
    // A literal whose source spells the value as written can be edited in place; an escaped one is reported without a fix.
    const inner = raw.slice(1, -1);
    const editable = inner === text;
    return [
      {
        text,
        replace: (fixer, start, end, next) => (editable ? fixer.replaceTextRange([node.range[0] + 1 + start, node.range[0] + 1 + end], next) : null),
      },
    ];
  }
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((quasi) => {
      const text = quasi.value.raw;
      const quasiText = sourceCode.getText(quasi);
      const offset = text ? quasiText.indexOf(text) : -1;
      return {
        text,
        replace: (fixer, start, end, next) => (offset === -1 ? null : fixer.replaceTextRange([quasi.range[0] + offset + start, quasi.range[0] + offset + end], next)),
      };
    });
  }
  return [];
}

/**
 * Collects the class groups of a file. Call `visitors()` for the AST visitors
 * to register, then `groups()` after `Program:exit`.
 * @param {import("eslint").Rule.RuleContext} context
 */
export function classGroupCollector(context) {
  const { sourceCode } = context;
  /** @type {ClassGroup[]} */
  const groups = [];
  /** Nodes already placed in a group, so a shared constant is checked once. */
  const seen = new Set();

  /** Adds the string nodes an expression can hold to `group`. */
  const collect = (expression, group, scopeNode) => {
    if (!expression) return;
    switch (expression.type) {
      case "Literal":
        if (typeof expression.value === "string") add(expression, group);
        return;
      case "TemplateLiteral":
        add(expression, group);
        for (const inner of expression.expressions) collect(inner, group, scopeNode);
        return;
      case "ConditionalExpression":
        collect(expression.consequent, group, scopeNode);
        collect(expression.alternate, group, scopeNode);
        return;
      case "LogicalExpression":
        if (expression.operator !== "&&") collect(expression.left, group, scopeNode);
        collect(expression.right, group, scopeNode);
        return;
      case "ArrayExpression":
        for (const element of expression.elements) collect(element, group, scopeNode);
        return;
      case "JSXExpressionContainer":
        collect(expression.expression, group, scopeNode);
        return;
      case "CallExpression":
        if (expression.callee.type === "Identifier" && CLASS_CALLEES.has(expression.callee.name)) {
          for (const argument of expression.arguments) collect(argument, group, scopeNode);
        }
        return;
      case "Identifier": {
        const init = declaredInit(expression, scopeNode);
        if (init) collect(init, group, init);
        return;
      }
      default:
    }
  };

  const add = (node, group) => {
    if (seen.has(node)) return;
    seen.add(node);
    group.nodes.push(node);
  };

  /** The initializer of the `const` an identifier names in this file, if it is one. */
  const declaredInit = (identifier, scopeNode) => {
    let scope = sourceCode.getScope(scopeNode);
    while (scope) {
      const variable = scope.set.get(identifier.name);
      if (variable) {
        const definition = variable.defs[0];
        if (definition?.type === "Variable" && definition.node.type === "VariableDeclarator" && definition.parent?.kind === "const") return definition.node.init;
        return undefined;
      }
      scope = scope.upper;
    }
    return undefined;
  };

  const newGroup = (element) => {
    const group = { nodes: [], element };
    groups.push(group);
    return group;
  };

  /** Walks a recipe definition object: every class-valued key starts a group. */
  const collectRecipe = (object, scopeNode, inVariants = false) => {
    if (!object || object.type !== "ObjectExpression") return;
    for (const property of object.properties) {
      if (property.type !== "Property") continue;
      const key = property.key.type === "Identifier" ? property.key.name : property.key.type === "Literal" ? String(property.key.value) : undefined;
      if (key === undefined) continue;
      const value = property.value;
      if (RECIPE_CLASS_KEYS.has(key) && !inVariants) {
        collect(value, newGroup(undefined), scopeNode);
      } else if (key === "slots") {
        if (value.type === "ObjectExpression") for (const slot of value.properties) if (slot.type === "Property") collect(slot.value, newGroup(undefined), scopeNode);
      } else if (key === "variants") {
        // variants: { size: { sm: "…", md: { slot: "…" } } }
        if (value.type === "ObjectExpression") {
          for (const variant of value.properties) {
            if (variant.type !== "Property" || variant.value.type !== "ObjectExpression") continue;
            for (const option of variant.value.properties) {
              if (option.type !== "Property") continue;
              if (option.value.type === "ObjectExpression") {
                for (const slot of option.value.properties) if (slot.type === "Property") collect(slot.value, newGroup(undefined), scopeNode);
              } else {
                collect(option.value, newGroup(undefined), scopeNode);
              }
            }
          }
        }
      } else if (key === "compoundVariants" && value.type === "ArrayExpression") {
        for (const compound of value.elements) {
          if (!compound || compound.type !== "ObjectExpression") continue;
          for (const field of compound.properties) {
            if (field.type !== "Property") continue;
            const name = field.key.type === "Identifier" ? field.key.name : undefined;
            if (name && RECIPE_CLASS_KEYS.has(name)) {
              if (field.value.type === "ObjectExpression") {
                for (const slot of field.value.properties) if (slot.type === "Property") collect(slot.value, newGroup(undefined), scopeNode);
              } else {
                collect(field.value, newGroup(undefined), scopeNode);
              }
            }
          }
        }
      } else if (inVariants) {
        collect(value, newGroup(undefined), scopeNode);
      }
    }
  };

  return {
    visitors: () => ({
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "className" || !node.value) return;
        const opening = node.parent;
        const element = opening?.name?.type === "JSXIdentifier" ? opening.name.name : undefined;
        collect(node.value, newGroup(element), node);
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        if (CLASS_CALLEES.has(node.callee.name)) {
          // A cx call that is itself inside a className or recipe was collected there.
          if (isInsideClassPosition(node)) return;
          const group = newGroup(undefined);
          for (const argument of node.arguments) collect(argument, group, node);
        } else if (RECIPE_CALLEES.has(node.callee.name)) {
          collectRecipe(node.arguments[0], node);
        }
      },
    }),
    groups: () => groups,
  };
}

/** True inside a JSX `className` or a recipe definition, where the outer visitor already collects. */
function isInsideClassPosition(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === "JSXAttribute") return current.name?.name === "className";
    if (current.type === "CallExpression" && current.callee.type === "Identifier" && RECIPE_CALLEES.has(current.callee.name)) return true;
    if (current.type === "Program" || current.type === "FunctionDeclaration" || current.type === "ArrowFunctionExpression") return false;
  }
  return false;
}
