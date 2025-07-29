#!/usr/bin/env node

import { program } from "commander";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";

function generateTree(files, baseDir) {
  // Ordenar los archivos para una mejor visualización
  files = files.sort();

  // Convertir rutas absolutas a relativas
  const relativeFiles = files.map((file) => path.relative(baseDir, file));

  // Crear estructura de árbol
  const tree = {};
  for (const file of relativeFiles) {
    const parts = file.split(path.sep);
    let current = tree;

    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  // Función para generar la representación en string del árbol
  function printTree(node, prefix = "", isLast = true) {
    const entries = Object.entries(node);
    let result = "";

    for (let [i, [key, value]] of entries.entries()) {
      const isLastEntry = i === entries.length - 1;
      const connector = isLastEntry ? "└── " : "├── ";
      const newPrefix = prefix + (isLastEntry ? "    " : "│   ");

      result += prefix + connector + chalk.cyan(key) + "\n";

      if (Object.keys(value).length > 0) {
        result += printTree(value, newPrefix, isLastEntry);
      }
    }

    return result;
  }

  return printTree(tree);
}

// Función corregida para parsear imports de un archivo
// Función corregida para parsear imports Y re-exports de un archivo
function parseImports(content, filePath) {
  const imports = new Set();

  // Procesamos línea por línea primero
  const lines = content.split("\n").slice(0, 1000); // Aumenté el límite y corregí el comentario

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Saltar líneas vacías o comentarios
    if (
      !trimmedLine ||
      trimmedLine.startsWith("//") ||
      trimmedLine.startsWith("/*") ||
      trimmedLine.startsWith("*")
    ) {
      continue;
    }

    let match;

    // 1. ES6 imports con from - MÁS ESPECÍFICO PRIMERO
    // import { something } from '...' o import something from '...'
    match = trimmedLine.match(
      /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+)?from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 2. Import type (TypeScript)
    match = trimmedLine.match(
      /import\s+type\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 3. Side effect imports - SOLO si no hay 'from'
    if (!trimmedLine.includes(" from ")) {
      match = trimmedLine.match(/import\s+['"`]([^'"`]+)['"`]/);
      if (match) {
        imports.add(match[1]);
      }
    }

    // 4. CommonJS require con asignación
    match = trimmedLine.match(
      /(?:const|let|var)\s+(?:\{[^}]*\}|\w+|\[[^\]]*\])\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 5. require() directo (sin asignación)
    match = trimmedLine.match(
      /(?:^|[^=\w])require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 6. Dynamic imports
    match = trimmedLine.match(/import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (match) {
      imports.add(match[1]);
    }

    // *** NUEVOS PATRONES PARA RE-EXPORTS ***

    // 7. Export named con from: export { something } from '...'
    match = trimmedLine.match(
      /export\s+\{[^}]*\}\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 8. Export type con from: export type { something } from '...'
    match = trimmedLine.match(
      /export\s+type\s+\{[^}]*\}\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 9. Export all: export * from '...'
    match = trimmedLine.match(
      /export\s+\*\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 10. Export all as: export * as something from '...'
    match = trimmedLine.match(
      /export\s+\*\s+as\s+\w+\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 11. Export default from: export { default } from '...'
    match = trimmedLine.match(
      /export\s+\{\s*default\s*(?:,\s*[^}]*)?\}\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }

    // 12. Export default as: export { default as something } from '...'
    match = trimmedLine.match(
      /export\s+\{\s*default\s+as\s+\w+\s*(?:,\s*[^}]*)?\}\s+from\s+['"`]([^'"`]+)['"`]/
    );
    if (match) {
      imports.add(match[1]);
    }
  }

  // Procesamiento adicional para imports/exports multilínea
  // Esto maneja casos donde el import/export se extiende por múltiples líneas

  // ES6 imports multilínea
  const multilineImportRegex =
    /import\s*\{[^}]*\}\s*from\s*['"`]([^'"`]+)['"`]/gs;
  let match;
  while ((match = multilineImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Destructuring multilínea de require
  const multilineRequireRegex =
    /(?:const|let|var)\s*\{[^}]*\}\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gs;
  while ((match = multilineRequireRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Import default multilínea
  const multilineDefaultImportRegex =
    /import\s+\w+\s*,\s*\{[^}]*\}\s*from\s*['"`]([^'"`]+)['"`]/gs;
  while ((match = multilineDefaultImportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // *** NUEVOS REGEX MULTILÍNEA PARA RE-EXPORTS ***

  // Export multilínea con from
  const multilineExportRegex =
    /export\s*\{[^}]*\}\s*from\s*['"`]([^'"`]+)['"`]/gs;
  while ((match = multilineExportRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  // Export type multilínea con from
  const multilineExportTypeRegex =
    /export\s+type\s*\{[^}]*\}\s*from\s*['"`]([^'"`]+)['"`]/gs;
  while ((match = multilineExportTypeRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return Array.from(imports);
}
// Función para verificar si un import es una dependencia local
function isLocalDependency(importPath) {
  // Si empieza con ./ o ../ es local
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return true;
  }

  // Si empieza con / es absoluto (consideramos local)
  if (importPath.startsWith("/")) {
    return true;
  }

  // Si no tiene / es probablemente un paquete npm
  if (!importPath.includes("/")) {
    return false;
  }

  // Si empieza con @ y no tiene más /, es scoped package
  if (
    importPath.startsWith("@") &&
    !importPath.startsWith("@/") &&
    importPath.split("/").length === 2
  ) {
    return false;
  }
  if (importPath.startsWith("@/")) {
    // Si empieza con @/ es un alias local
    return true;
  }
  // En otros casos, asumimos que es local
  return true;
}

// Función para resolver la ruta de un import
async function resolveImportPath(
  importPath,
  currentFilePath = "",
  packageJsonPath = null
) {
  if (!currentFilePath) {
    throw new Error("Current file path is required to resolve imports");
  }
  if (!importPath) {
    throw new Error("Import path is required to resolve imports");
  }

  const currentDir = path.dirname(currentFilePath);

  let resolvedPath;

  if (path.isAbsolute(importPath)) {
    resolvedPath = importPath;
  } else {
    resolvedPath = path.resolve(currentDir, importPath);
  }

  // si es un alias local, resolverlo
  if (importPath.startsWith("@/")) {
    // Reemplazar @/ por la ruta del directorio base
    const baseDir = packageJsonPath;

    resolvedPath = path.resolve(baseDir, 'src', importPath.slice(2));
  }

  // Intentar diferentes extensiones si el archivo no existe
  const extensions = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

  for (const ext of extensions) {
    const fullPath = resolvedPath + ext;
    try {
      const stats = await fs.stat(fullPath);
      if (stats) {
        return fullPath;
      }
    } catch (error) {
      // Continuar con la siguiente extensión
    }
  }

  // Intentar como directorio con index
  const indexExtensions = [
    "/index.js",
    "/index.jsx",
    "/index.ts",
    "/index.tsx",
    "/index.mjs",
    "/index.cjs",
  ];

  for (const indexExt of indexExtensions) {
    const indexPath = resolvedPath + indexExt;
    try {
      const stats = await fs.stat(indexPath);
      if (stats) {
        return indexPath;
      }
    } catch (error) {
      // Continuar con la siguiente extensión
    }
  }

  return null;
}

// Función para minificar contenido basado en el tipo de archivo
function minifyContent(content, filePath, minifyLevel = "medium") {
  const extension = path.extname(filePath).toLowerCase();

  // Función base para eliminar comentarios y espacios
  function basicMinify(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  // Función para eliminar comentarios de JavaScript/TypeScript
  function removeJSComments(text) {
    // Eliminar comentarios de línea (//)
    text = text.replace(/\/\/.*$/gm, "");

    // Eliminar comentarios de bloque (/* */) - versión simple
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");

    return text;
  }

  // Función para eliminar comentarios de CSS
  function removeCSSComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  // Función para eliminar comentarios de HTML
  function removeHTMLComments(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "");
  }

  // Función para minificación agresiva
  function aggressiveMinify(text) {
    return text
      .replace(/\s+/g, " ")
      .replace(/\s*([{}();,])\s*/g, "$1")
      .replace(/;\s*}/g, "}")
      .trim();
  }

  try {
    let minified = content;

    // Aplicar minificación según el tipo de archivo
    switch (extension) {
      case ".js":
      case ".jsx":
      case ".ts":
      case ".tsx":
      case ".mjs":
      case ".cjs":
        minified = removeJSComments(minified);
        break;

      case ".css":
      case ".scss":
      case ".sass":
      case ".less":
        minified = removeCSSComments(minified);
        break;

      case ".html":
      case ".htm":
        minified = removeHTMLComments(minified);
        break;

      case ".json":
        try {
          // Para JSON, parsear y stringify sin espacios
          const parsed = JSON.parse(minified);
          minified = JSON.stringify(parsed);
        } catch (e) {
          // Si no es JSON válido, aplicar minificación básica
          minified = basicMinify(minified);
        }
        break;

      case ".xml":
      case ".svg":
        minified = removeHTMLComments(minified);
        break;

      default:
        // Para otros tipos de archivo, solo minificación básica
        break;
    }

    // Aplicar nivel de minificación
    switch (minifyLevel) {
      case "light":
        minified = minified
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .join("\n");
        break;

      case "medium":
        minified = basicMinify(minified);
        break;

      case "aggressive":
        if (
          [".js", ".jsx", ".ts", ".tsx", ".css", ".html"].includes(extension)
        ) {
          minified = aggressiveMinify(basicMinify(minified));
        } else {
          minified = basicMinify(minified);
        }
        break;

      default:
        minified = basicMinify(minified);
    }

    return minified;
  } catch (error) {
    return basicMinify(content);
  }
}

// Función para calcular estadísticas de compresión
function calculateCompressionStats(original, minified) {
  const originalSize = original.length;
  const minifiedSize = minified.length;
  const reduction = originalSize - minifiedSize;
  const percentage =
    originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(1) : 0;

  return {
    originalSize,
    minifiedSize,
    reduction,
    percentage,
  };
}

async function findPackageJsonFromFile(filePath) {
  // max 10 levels up
  let currentDir = path.dirname(filePath);

  for (let i = 0; i < 10; i++) {
    const packageJsonPath = path.join(currentDir, "package.json");

    try {
      const stats = await fs.stat(packageJsonPath);

      if (stats) {
        // Si existe, devolver la ruta
        return currentDir;
      }
    } catch (error) {
      // Si no existe, continuar subiendo
    }

    // Subir un nivel
    currentDir = path.dirname(currentDir);
  }
}

// Función para seguir imports recursivamente con control de profundidad
async function followImports(
  entryFile,
  processedFiles = new Set(),
  spinner,
  maxDepth = Infinity
) {
  const files = [];
  const queue = [{ file: entryFile, depth: 0 }];
  const packageJsonPath = await findPackageJsonFromFile(entryFile);
  while (queue.length > 0) {
    const { file: currentFile, depth } = queue.shift();
    const normalizedPath = path.resolve(currentFile);

    if (processedFiles.has(normalizedPath)) {
      continue;
    }

    processedFiles.add(normalizedPath);

    try {
      const stats = await fs.stat(normalizedPath);
      if (!stats.isFile()) {
        continue;
      }

      files.push(normalizedPath);
      spinner.text = chalk.blue(
        `Processing (depth ${depth}): ${path.basename(normalizedPath)}`
      );

      // Solo seguir imports si no hemos alcanzado la profundidad máxima
      if (depth < maxDepth) {
        const content = await fs.readFile(normalizedPath, "utf8");
        const imports = parseImports(content, normalizedPath);

        for (const importPath of imports) {
          if (!isLocalDependency(importPath)) {
            continue;
          }

          const resolvedPath = await resolveImportPath(
            importPath,
            normalizedPath,
            packageJsonPath
          );

          if (resolvedPath && !processedFiles.has(path.resolve(resolvedPath))) {
            queue.push({ file: resolvedPath, depth: depth + 1 });
          }
        }
      }
    } catch (error) {}
  }

  return files;
}

program
  .name("fileweaver")
  .description(
    "A powerful CLI tool for weaving files together with advanced pattern matching capabilities"
  )
  .version("1.4.1")
  .option("-r, --regex <pattern>", "regex pattern to match files")
  .option("-t, --tree <true|false>", "add tree to output file")
  .option("-p, --prompt <prompt>", "add prompt to output file")
  .option("-ir, --ignoreregex <pattern>", "regex pattern to ignore files")
  .option("-d, --directory <path>", "directory path", process.cwd())
  .option("-h, --headers", "add file headers to content", false)
  .option("-o, --output <file>", "output file name", "output.txt")
  .option("-f, --follow-imports <file>", "follow imports from entry file")
  .option(
    "--max-depth <number>",
    "maximum depth for following imports (default: unlimited)",
    parseInt
  )
  .option(
    "-m, --minify [level]",
    "minify content before concatenation (light|medium|aggressive)",
    "medium"
  )
  .option("--stats", "show compression statistics", false)
  .parse(process.argv);

const options = program.opts();

async function weaveFiles() {
  const spinner = ora();
  const progressBar = new cliProgress.SingleBar({
    format:
      chalk.cyan("{bar}") + " | {percentage}% | {value}/{total} Files | {file}",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  try {
    let files = [];
    let directory = path.resolve(options.directory);

    if (options.followImports) {
      // Modo follow imports
      spinner.start(chalk.blue("Following imports..."));

      const entryFile = path.resolve(options.followImports);

      try {
        const stats = await fs.stat(entryFile);
        if (!stats.isFile()) {
          spinner.fail(chalk.red("Error: Entry file is not a valid file"));
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(
          chalk.red(`Error: Entry file not found: ${error.message}`)
        );
        process.exit(1);
      }

      files = await followImports(
        entryFile,
        new Set(),
        spinner,
        options.maxDepth
      );
      directory = path.dirname(entryFile);
    } else {
      // Modo tradicional por directorio
      spinner.start(chalk.blue("Scanning directory..."));

      const stats = await fs.stat(directory);

      if (!stats.isDirectory()) {
        spinner.fail(chalk.red("Error: Specified path is not a directory"));
        process.exit(1);
      }

      // Buscar archivos
      const searchPattern = path.join(directory, "**/*");
      files = await glob(searchPattern, {
        nodir: true,
        ignore: ["**/node_modules/**"],
        absolute: true,
      });

      // Aplicar filtros
      if (options.regex) {
        spinner.text = chalk.blue("Applying regex filter...");
        try {
          const regex = new RegExp(options.regex);
          files = files.filter((file) => regex.test(path.basename(file)));
        } catch (error) {
          spinner.fail(
            chalk.red(`Error: Invalid regex pattern: ${error.message}`)
          );
          process.exit(1);
        }
      }

      if (options.ignoreregex) {
        spinner.text = chalk.blue("Applying ignore patterns...");
        try {
          const ignoreRegex = new RegExp(options.ignoreregex);
          files = files.filter((file) => {
            const relativePath = path.relative(directory, file);
            return !ignoreRegex.test(relativePath) && !ignoreRegex.test(file);
          });
        } catch (error) {
          spinner.fail(
            chalk.red(`Error: Invalid ignore regex pattern: ${error.message}`)
          );
          process.exit(1);
        }
      }
    }

    if (files.length === 0) {
      spinner.fail(
        chalk.red("Error: No files found matching the specified patterns")
      );
      process.exit(1);
    }

    const modeText = options.followImports ? "imports chain" : "directory scan";
    const minifyText = options.minify ? ` (minify: ${options.minify})` : "";
    spinner.succeed(
      chalk.green(
        `Found ${files.length} files to process (${modeText}${minifyText})`
      )
    );

    const tree = generateTree(files, directory);

    // Mostrar árbol de archivos

    // Iniciar la barra de progreso
    progressBar.start(files.length, 0, { file: "Starting..." });

    // Leer y concatenar archivos
    let output = "";
    let processedFiles = 0;
    let totalOriginalSize = 0;
    let totalMinifiedSize = 0;

    for (const file of files) {
      try {
        const content = await fs.readFile(file, "utf8");
        let processedContent = content;

        // Minificar si está habilitado
        if (options.minify) {
          processedContent = minifyContent(content, file, options.minify);

          if (options.stats) {
            totalOriginalSize += content.length;
            totalMinifiedSize += processedContent.length;
          }
        }

        if (options.headers) {
          output += `\n${"=".repeat(50)}\n`;
          output += `File: ${path.relative(directory, file)}\n`;
          output += `${"=".repeat(50)}\n\n`;
        }
        output += processedContent + "\n";

        processedFiles++;

        // Actualizar barra de progreso
        progressBar.update(processedFiles, {
          file: chalk.blue(path.basename(file)),
        });
      } catch (error) {}
    }

    // Agregar árbol si está habilitada la opción
    if (options.tree) {
      output += "\n" + "=".repeat(50) + "\n";
      output += "Directory Tree:\n";
      output += "=".repeat(50) + "\n\n";
      output += tree;
    }

    // Agregar prompt si está especificado
    if (options.prompt) {
      output += "\n" + "=".repeat(50) + "\n";
      output += "Prompt:\n";
      output += "=".repeat(50) + "\n\n";
      output += options.prompt + "\n";
    }

    progressBar.stop();

    // Escribir resultado
    spinner.start(chalk.blue("Saving output file..."));
    const outputPath = path.resolve(options.output);
    await fs.writeFile(outputPath, output.trim());

    const modeDescription = options.followImports
      ? `Following imports from ${path.basename(options.followImports)}${
          options.maxDepth
            ? ` (max depth: ${options.maxDepth})`
            : " (unlimited depth)"
        }`
      : "Directory scan";

    // Mostrar estadísticas de compresión si están habilitadas
    if (options.stats && options.minify && totalOriginalSize > 0) {
      const stats = calculateCompressionStats(
        { length: totalOriginalSize },
        { length: totalMinifiedSize }
      );
    }

    spinner.succeed(
      chalk.green(
        `Successfully processed ${processedFiles} file${
          processedFiles !== 1 ? "s" : ""
        } and saved to ${outputPath} (${modeDescription})`
      )
    );
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

weaveFiles();
