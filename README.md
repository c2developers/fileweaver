# 📁 FileWeaver

<div align="center">

![Version](https://img.shields.io/npm/v/fileweaver)
![Downloads](https://img.shields.io/npm/dm/fileweaver)
![License](https://img.shields.io/npm/l/fileweaver)
![Node](https://img.shields.io/node/v/fileweaver)

A powerful CLI tool for weaving files together with advanced pattern matching capabilities, featuring visual progress and tree view of processed files.

[Installation](#installation) •
[Usage](#usage) •
[Examples](#examples) •
[Contributing](#contributing)

</div>

## ✨ Features

- 🔍 **Regex Pattern Matching**: Filter files using regular expressions
- 🚫 **Exclusion Patterns**: Ignore files that match specific patterns
- 📂 **Directory Support**: Process files from any directory
- 📑 **File Headers**: Option to include original filenames in the output
- 🎯 **Flexible Output**: Specify custom output location and filename
- 🌳 **Tree View**: Visual representation of processed files with optional inclusion in output
- 📊 **Progress Bar**: Real-time processing visualization
- 🎨 **Colored Output**: Enhanced readability with color-coded messages
- 📝 **Custom Prompts**: Add custom prompts to the output file
- 🗂️ **Directory Tree**: Include directory structure in the output file

## 🚀 Installation

```bash
npm install -g fileweaver
```

## 🔧 Usage

```bash
fileweaver [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --regex <pattern>` | Regex pattern to match files | - |
| `-ir, --ignoreregex <pattern>` | Regex pattern to ignore files | - |
| `-d, --directory <path>` | Directory path | Current directory |
| `-h, --headers` | Add file headers to content | false |
| `-o, --output <file>` | Output file name | output.txt |
| `-t, --tree` | Include directory tree in output file | false |
| `-p, --prompt <text>` | Add custom prompt to output file | - |
| `--version` | Show version number | - |
| `--help` | Show help | - |

## 📋 Examples

### Basic File Concatenation with Tree

```bash
fileweaver -d . -r "\.js$" -t true -o combined.js
```

This will include a tree view in the output file:
```
==================================================
Directory Tree:
==================================================
├── src
│   ├── index.js
│   └── utils
│       ├── helper.js
│       └── validator.js
└── index.js
```

### Add Custom Prompt

```bash
fileweaver -r "\.md$" -p "Process these markdown files for documentation" -o docs.md
```

Output will include:
```
==================================================
Prompt:
==================================================
Process these markdown files for documentation
```

### Combine Multiple Features

```bash
fileweaver -d ./src -r "\.(js|ts)$" -h true -t true -p "Review this code" -o bundle.js
```

This will:
- Process all .js and .ts files
- Add headers for each file
- Include the directory tree
- Add the specified prompt
- Save everything to bundle.js

### Process Multiple File Types

```bash
fileweaver -d ./src -r "\.(js|ts)$" -h true -o bundle.js
```

Output tree:
```
Files to be processed:
└── src
    ├── components
    │   ├── Button.ts
    │   └── Input.js
    └── utils
        ├── helpers.js
        └── types.ts
```

### Exclude Multiple Patterns

```bash
fileweaver -d . -r "\.js$" -ir "node_modules|dist|test" -o prod.js
```

Tree view:
```
Files to be processed:
├── src
│   ├── main.js
│   └── config.js
└── index.js
```

### With Headers in Output

The `-h` flag adds file headers to the output:
```
==================================================
File: src/main.js
==================================================
// Main file content here...

==================================================
File: src/config.js
==================================================
// Config file content here...
```

## 🔍 Advanced Usage

### Nested Directories with Tree and Prompt

Process files in nested directories, include tree structure, and add a processing prompt:
```bash
fileweaver -d ./project -r "\.css$" -ir "vendor|temp" -t true -p "Combine all CSS files" -o styles.css
```

### Complex Pattern Matching with Custom Output

```bash
fileweaver -r "\.(html|ejs)$" -ir "temp_|draft_" -h true -t true -o templates.html
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## 🛟 Support

For support and questions, please [open an issue](https://github.com/c2developers/fileweaver/issues) on GitHub.

---

<div align="center">
Made with ❤️ by C2Developers
</div>