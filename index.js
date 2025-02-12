#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import ora from 'ora';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

function generateTree(files, baseDir) {
  // Ordenar los archivos para una mejor visualización
  files = files.sort();
  
  // Convertir rutas absolutas a relativas
  const relativeFiles = files.map(file => path.relative(baseDir, file));
  
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
  function printTree(node, prefix = '', isLast = true) {
    const entries = Object.entries(node);
    let result = '';

    for (let [i, [key, value]] of entries.entries()) {
      const isLastEntry = i === entries.length - 1;
      const connector = isLastEntry ? '└── ' : '├── ';
      const newPrefix = prefix + (isLastEntry ? '    ' : '│   ');
      
      result += prefix + connector + chalk.cyan(key) + '\n';
      
      if (Object.keys(value).length > 0) {
        result += printTree(value, newPrefix, isLastEntry);
      }
    }
    
    return result;
  }

  return printTree(tree);
}

program
  .name('fileweaver')
  .description('A powerful CLI tool for weaving files together with advanced pattern matching capabilities')
  .version('1.0.0')
  .option('-r, --regex <pattern>', 'regex pattern to match files')
  .option('-t, --tree <true|false>', 'add tree to output file')
  .option('-p, --prompt <prompt>', 'add prompt to output file')
  .option('-ir, --ignoreregex <pattern>', 'regex pattern to ignore files')
  .option('-d, --directory <path>', 'directory path', process.cwd())
  .option('-h, --headers', 'add file headers to content', false)
  .option('-o, --output <file>', 'output file name', 'output.txt')
  .parse(process.argv);

const options = program.opts();

async function weaveFiles() {
  const spinner = ora();
  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} Files | {file}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  try {
    // Iniciando búsqueda
    spinner.start(chalk.blue('Scanning directory...'));
    
    const directory = path.resolve(options.directory);
    const stats = await fs.stat(directory);
    
    if (!stats.isDirectory()) {
      spinner.fail(chalk.red('Error: Specified path is not a directory'));
      process.exit(1);
    }

    // Buscar archivos
    const searchPattern = path.join(directory, '**/*');
    let files = await glob(searchPattern, { 
      nodir: true,
      ignore: ['**/node_modules/**'],
      absolute: true
    });

    // Aplicar filtros
    if (options.regex) {
      spinner.text = chalk.blue('Applying regex filter...');
      try {
        const regex = new RegExp(options.regex);
        files = files.filter(file => regex.test(path.basename(file)));
      } catch (error) {
        spinner.fail(chalk.red(`Error: Invalid regex pattern: ${error.message}`));
        process.exit(1);
      }
    }

    if (options.ignoreregex) {
      spinner.text = chalk.blue('Applying ignore patterns...');
      try {
        const ignoreRegex = new RegExp(options.ignoreregex);
        files = files.filter(file => {
          const relativePath = path.relative(directory, file);
          return !ignoreRegex.test(relativePath) && !ignoreRegex.test(file);
        });
      } catch (error) {
        spinner.fail(chalk.red(`Error: Invalid ignore regex pattern: ${error.message}`));
        process.exit(1);
      }
    }

    if (files.length === 0) {
      spinner.fail(chalk.red('Error: No files found matching the specified patterns'));
      process.exit(1);
    }

    spinner.succeed(chalk.green(`Found ${files.length} files to process`));

    const tree = generateTree(files, directory);

    // Mostrar árbol de archivos
    console.log(chalk.yellow('\nFiles to be processed:'));
    console.log(tree);

    // Iniciar la barra de progreso
    progressBar.start(files.length, 0, { file: 'Starting...' });

    // Leer y concatenar archivos
    let output = '';
    let processedFiles = 0;

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (options.headers) {
          output += `\n${'='.repeat(50)}\n`;
          output += `File: ${path.relative(directory, file)}\n`;
          output += `${'='.repeat(50)}\n\n`;
        }
        output += content + '\n';

        processedFiles++;
        
        // Actualizar barra de progreso
        progressBar.update(processedFiles, { 
          file: chalk.blue(path.basename(file))
        });
      } catch (error) {
        console.error(chalk.red(`\nWarning: Could not read file ${file}: ${error.message}`));
      }
    }


    if(options.tree){
      output += `Tree
      ${tree}`
    }


    if(options.prompt){
      output += `============================================
      ${options.prompt}`
    }

    progressBar.stop();

    // Escribir resultado
    spinner.start(chalk.blue('Saving output file...'));
    const outputPath = path.resolve(options.output);
    await fs.writeFile(outputPath, output.trim());
    
    spinner.succeed(chalk.green(
      `Successfully processed ${processedFiles} file${processedFiles !== 1 ? 's' : ''} and saved to ${outputPath}`
    ));
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

weaveFiles();