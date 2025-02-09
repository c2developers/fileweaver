#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import glob from 'glob';
import { promisify } from 'util';

const globPromise = promisify(glob);

// Colorear la salida de consola
const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  reset: '\x1b[0m'
};

program
  .name('fileweaver')
  .description('A powerful CLI tool for weaving files together with advanced pattern matching capabilities')
  .version('1.0.0')
  .option('-r, --regex <pattern>', 'regex pattern to match files')
  .option('-ir, --ignoreregex <pattern>', 'regex pattern to ignore files')
  .option('-d, --directory <path>', 'directory path', process.cwd())
  .option('-h, --headers', 'add file headers to content', false)
  .option('-o, --output <file>', 'output file name', 'output.txt')
  .parse(process.argv);

const options = program.opts();

async function weaveFiles() {
  try {
    // Validar el directorio
    const directory = path.resolve(options.directory);
    const stats = await fs.stat(directory);
    
    if (!stats.isDirectory()) {
      console.error(colors.error + 'Error: Specified path is not a directory' + colors.reset);
      process.exit(1);
    }

    // Construir el patrón de búsqueda
    const searchPattern = path.join(directory, '**/*');
    
    // Obtener lista de archivos
    let files = await globPromise(searchPattern, { nodir: true });

    // Aplicar filtro regex si se especificó
    if (options.regex) {
      try {
        const regex = new RegExp(options.regex);
        files = files.filter(file => regex.test(path.basename(file)));
      } catch (error) {
        console.error(colors.error + `Error: Invalid regex pattern: ${error.message}` + colors.reset);
        process.exit(1);
      }
    }

    // Aplicar filtro de ignorar si se especificó
    if (options.ignoreregex) {
      try {
        const ignoreRegex = new RegExp(options.ignoreregex);
        files = files.filter(file => !ignoreRegex.test(path.basename(file)));
      } catch (error) {
        console.error(colors.error + `Error: Invalid ignore regex pattern: ${error.message}` + colors.reset);
        process.exit(1);
      }
    }

    if (files.length === 0) {
      console.error(colors.error + 'Error: No files found matching the specified patterns' + colors.reset);
      process.exit(1);
    }

    // Leer y concatenar archivos
    let output = '';
    let processedFiles = 0;
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (options.headers) {
          output += `\n${'='.repeat(50)}\n`;
          output += `File: ${path.basename(file)}\n`;
          output += `${'='.repeat(50)}\n\n`;
        }
        output += content + '\n';
        processedFiles++;
      } catch (error) {
        console.error(colors.error + `Warning: Could not read file ${file}: ${error.message}` + colors.reset);
      }
    }

    // Escribir resultado
    const outputPath = path.resolve(options.output);
    await fs.writeFile(outputPath, output.trim());
    
    console.log(
      colors.success +
      `Successfully processed ${processedFiles} file${processedFiles !== 1 ? 's' : ''} and saved to ${outputPath}` +
      colors.reset
    );
  } catch (error) {
    console.error(colors.error + `Error: ${error.message}` + colors.reset);
    process.exit(1);
  }
}

weaveFiles();