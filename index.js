#!/usr/bin/env node

import { program } from "commander";
import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import ora from "ora";
import cliProgress from "cli-progress";
import chalk from "chalk";

// Función para generar árbol del proyecto desde package.json
async function generateProjectTree(baseDir) {
  // Buscar package.json para determinar el directorio raíz del proyecto
  let projectRoot = baseDir;
  try {
    const packageJsonPath = await findPackageJsonFromFile(path.join(baseDir, 'dummy'));
    if (packageJsonPath) {
      projectRoot = packageJsonPath;
    }
  } catch (error) {
    // Si no se encuentra package.json, usar baseDir
  }

  // Patrones a ignorar (archivos y directorios comunes)
  const ignorePatterns = [
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    '.cache',
    '.temp',
    '.tmp',
    'tmp',
    'coverage',
    '.nyc_output',
    '.coverage',
    'logs',
    '*.log',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.DS_Store',
    'Thumbs.db',
    '*.swp',
    '*.swo',
    '.vscode',
    '.idea',
    '*.iml',
    '.eslintcache',
    '.tsbuildinfo',
    'yarn-error.log',
    'npm-debug.log*',
    'lerna-debug.log*',
    '.pnpm-debug.log*'
  ];

  // Función para verificar si un archivo/directorio debe ser ignorado
  function shouldIgnore(itemPath) {
    const basename = path.basename(itemPath);
    
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Manejar patrones con wildcards
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(basename);
      }
      return basename === pattern || basename.startsWith(pattern);
    });
  }

  // Función recursiva para construir el árbol
  async function buildTree(dirPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return {};
    
    const tree = {};
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items.sort()) {
        const itemPath = path.join(dirPath, item);
        
        if (shouldIgnore(itemPath)) continue;
        
        try {
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            // Es un directorio, construir subárbol
            const subtree = await buildTree(itemPath, maxDepth, currentDepth + 1);
            if (Object.keys(subtree).length > 0 || currentDepth < 2) {
              tree[item + '/'] = subtree;
            }
          } else {
            // Es un archivo
            tree[item] = {};
          }
        } catch (error) {
          // Ignorar errores de acceso a archivos individuales
        }
      }
    } catch (error) {
      // Ignorar errores de acceso al directorio
    }
    
    return tree;
  }

  // Función para generar la representación en string del árbol
  function printTree(node, prefix = "", isLast = true) {
    const entries = Object.entries(node);
    let result = "";

    for (let [i, [key, value]] of entries.entries()) {
      const isLastEntry = i === entries.length - 1;
      const connector = isLastEntry ? "└── " : "├── ";
      const newPrefix = prefix + (isLastEntry ? "    " : "│   ");

      // Colorear directorios y archivos de manera diferente
      const displayName = key.endsWith('/') 
        ? chalk.blue.bold(key.slice(0, -1)) // Directorios en azul
        : chalk.cyan(key); // Archivos en cian

      result += prefix + connector + displayName + "\n";

      if (Object.keys(value).length > 0) {
        result += printTree(value, newPrefix, isLastEntry);
      }
    }

    return result;
  }

  const tree = await buildTree(projectRoot);
  return {
    content: printTree(tree),
    projectRoot
  };
}

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

// Función corregida para parsear imports Y re-exports de un archivo
function parseImports(content, filePath) {
  const imports = new Set();
  
  // Procesamos línea por línea primero
  const lines = content.split("\n") // Aumenté el límite y corregí el comentario

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
      // si no es un directorio, devolver la ruta
      if (stats && !stats.isDirectory()) {
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
function minifyContent(content, filePath, minifyLevel = "aggressive") {
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
        // Parsear imports del contenido del archivo
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

// Función para procesar múltiples archivos de entrada
async function processMultipleEntryFiles(entryFiles, spinner, maxDepth) {
  const allFiles = [];
  const processedFiles = new Set();
  
  for (const entryFile of entryFiles) {
    spinner.text = chalk.blue(`Processing entry file: ${path.basename(entryFile)}`);
    
    try {
      const stats = await fs.stat(entryFile);
      if (!stats.isFile()) {
        spinner.warn(chalk.yellow(`Warning: ${entryFile} is not a valid file, skipping`));
        continue;
      }
    } catch (error) {
      spinner.warn(chalk.yellow(`Warning: Entry file not found: ${entryFile}, skipping`));
      continue;
    }
    
    const files = await followImports(entryFile, processedFiles, spinner, maxDepth);
    allFiles.push(...files);
  }
  
  // Eliminar duplicados manteniendo el orden
  return [...new Set(allFiles)];
}

// Función para determinar el directorio base común de múltiples archivos
function findCommonBaseDirectory(files) {
  if (files.length === 0) return process.cwd();
  if (files.length === 1) return path.dirname(files[0]);
  
  const resolvedFiles = files.map(file => path.resolve(file));
  const pathParts = resolvedFiles.map(file => file.split(path.sep));
  
  // Encontrar la parte común más larga
  let commonParts = pathParts[0];
  
  for (let i = 1; i < pathParts.length; i++) {
    const currentParts = pathParts[i];
    const newCommonParts = [];
    
    for (let j = 0; j < Math.min(commonParts.length, currentParts.length); j++) {
      if (commonParts[j] === currentParts[j]) {
        newCommonParts.push(commonParts[j]);
      } else {
        break;
      }
    }
    
    commonParts = newCommonParts;
  }
  
  return commonParts.length > 0 ? commonParts.join(path.sep) : process.cwd();
}

program
  .name("fileweaver")
  .description(
    "A powerful CLI tool for weaving files together with advanced pattern matching capabilities"
  )
  .version("1.4.1")
  .option("-r, --regex <pattern>", "regex pattern to match files")
  .option("-t, --tree", "add project tree to output file", true)
  .option("-p, --prompt <prompt>", "add prompt to output file")
  .option("-ir, --ignoreregex <pattern>", "regex pattern to ignore files")
  .option("-d, --directory <path>", "directory path", process.cwd())
  .option("-h, --headers", "add file headers to content", true)
  .option("-o, --output <file>", "output file name", "output.txt")
  .option("-f, --follow-imports <files...>", "follow imports from entry files (can specify multiple files)")
  .option(
    "--max-depth <number>",
    "maximum depth for following imports (default: unlimited)",
    parseInt
  )
  .option(
    "-m, --minify [level]",
    "minify content before concatenation (light|medium|aggressive)",
    "aggressive"
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

    if (options.followImports && options.followImports.length > 0) {
      // Modo follow imports con soporte para múltiples archivos
      spinner.start(chalk.blue("Following imports from multiple entry files..."));

      const entryFiles = options.followImports.map(file => path.resolve(file));
      
      files = await processMultipleEntryFiles(entryFiles, spinner, options.maxDepth);
      
      // Determinar el directorio base común para todos los archivos
      directory = findCommonBaseDirectory([...entryFiles, ...files]);
      
      if (files.length === 0) {
        spinner.fail(chalk.red("Error: No valid entry files found or no files to process"));
        process.exit(1);
      }
      
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

    const modeText = options.followImports 
      ? `imports chain from ${options.followImports.length} entry file${options.followImports.length > 1 ? 's' : ''}` 
      : "directory scan";
    const minifyText = options.minify ? ` (minify: ${options.minify})` : "";
    spinner.succeed(
      chalk.green(
        `Found ${files.length} files to process (${modeText}${minifyText})`
      )
    );

    // Generar árbol del proyecto (mejorado)
    let projectTree = "";
    let projectRoot = directory;
    
    if (options.tree) {
      spinner.start(chalk.blue("Generating project tree..."));
      try {
        const treeResult = await generateProjectTree(directory);
        projectTree = treeResult.content;
        projectRoot = treeResult.projectRoot;
        spinner.succeed(chalk.green("Project tree generated"));
      } catch (error) {
        spinner.warn(chalk.yellow("Warning: Could not generate project tree, using processed files tree"));
        projectTree = generateTree(files, directory);
      }
    }

    const processedFilesTree = generateTree(files, directory);

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
      output += "Project Structure:\n";
      output += "=".repeat(50) + "\n\n";
      output += projectTree;
      
      // Agregar también el árbol de archivos procesados si es diferente
      if (projectTree !== processedFilesTree && files.length < 50) {
        output += "\n" + "=".repeat(50) + "\n";
        output += "Processed Files:\n";
        output += "=".repeat(50) + "\n\n";
        output += processedFilesTree;
      }
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
      ? `Following imports from ${options.followImports.length} entry file${options.followImports.length > 1 ? 's' : ''}: ${options.followImports.map(f => path.basename(f)).join(', ')}${
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
      
      console.log(chalk.cyan("\nCompression Statistics:"));
      console.log(`${chalk.green("Original size:")} ${totalOriginalSize.toLocaleString()} bytes`);
      console.log(`${chalk.green("Minified size:")} ${totalMinifiedSize.toLocaleString()} bytes`);
      console.log(`${chalk.green("Reduction:")} ${stats.reduction.toLocaleString()} bytes (${stats.percentage}%)`);
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