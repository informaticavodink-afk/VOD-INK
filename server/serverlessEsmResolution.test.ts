import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['api', 'server', 'utils', 'src/lib', 'src/domain', 'src/types'];

function collectProductionTypeScriptFiles() {
  const files: string[] = [];
  const visit = (relativePath: string) => {
    const absolutePath = path.join(ROOT, relativePath);
    if (!existsSync(absolutePath)) return;
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) visit(child);
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.includes('.test.') && !entry.name.endsWith('.d.ts')) {
        files.push(child);
      }
    }
  };
  SOURCE_ROOTS.forEach(visit);
  if (existsSync(path.join(ROOT, 'src/types.ts'))) files.push('src/types.ts');
  return files;
}

function runtimeRelativeSpecifiers(relativePath: string) {
  const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
  const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];

  const addIfRelative = (node: ts.Expression | undefined) => {
    if (node && ts.isStringLiteral(node) && /^\.{1,2}\//.test(node.text)) specifiers.push(node.text);
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) addIfRelative(node.moduleSpecifier);
    if (ts.isExportDeclaration(node) && !node.isTypeOnly) addIfRelative(node.moduleSpecifier);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) addIfRelative(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

describe('Vercel serverless ESM resolution', () => {
  const sourceFiles = collectProductionTypeScriptFiles();

  it('usa extensiones JavaScript explícitas en todos los imports relativos de runtime', () => {
    const invalid = sourceFiles.flatMap((file) => runtimeRelativeSpecifiers(file)
      .filter((specifier) => !/\.(?:c|m)?js$|\.json$|\.node$/.test(specifier))
      .map((specifier) => `${file} -> ${specifier}`));

    expect(invalid, 'Node ESM no resuelve imports relativos sin extensión').toEqual([]);
  });

  it('transpila y carga el grafo serverless como ESM sin bundler', () => {
    const outputRoot = path.join(ROOT, 'scratch', `serverless-esm-${process.pid}`);
    rmSync(outputRoot, { recursive: true, force: true });

    try {
      for (const relativePath of sourceFiles) {
        const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
        const output = ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            esModuleInterop: true,
          },
          fileName: relativePath,
        }).outputText;
        const outputPath = path.join(outputRoot, relativePath.replace(/\.ts$/, '.js'));
        mkdirSync(path.dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, output);
      }
      writeFileSync(path.join(outputRoot, 'package.json'), JSON.stringify({ type: 'module' }));

      const entries = [
        'api/consents/[id]/technique.js',
        'api/consents/[id]/sign-artist.js',
        'server/consents.js',
      ].map((entry) => pathToFileURL(path.join(outputRoot, entry)).href);
      const script = entries.map((entry) => `await import(${JSON.stringify(entry)});`).join('\n');
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' },
      });

      expect(result.status, result.stderr || result.stdout).toBe(0);
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });
});
