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
- 🌳 **Tree View**: Visual representation of processed files
- 📊 **Progress Bar**: Real-time processing visualization
- 🎨 **Colored Output**: Enhanced readability with color-coded messages

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
| `--version` | Show version number | - |
| `--help` | Show help | - |

## 📋 Examples

### Concatenate JavaScript Files

```bash
fileweaver -d . -r "\.js$" -ir "node_modules" -h true -o combined.js
```

This will show a tree view of files to be processed:
```
Files to be processed:
├── src
│   ├── index.js
│   └── utils
│       ├── helper.js
│       └── validator.js
└── index.js

[==================] | 100% | 4/4 Files | validator.js
✔ Successfully processed 4 files and saved to combined.js
```

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

### Nested Directories

Process files in nested directories and exclude specific patterns:
```bash
fileweaver -d ./project -r "\.css$" -ir "vendor|temp" -o styles.css
```

### Multiple File Types with Complex Patterns

```bash
fileweaver -r "\.(html|ejs)$" -ir "temp_|draft_" -h true -o templates.html
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
Made with ❤️ by [Your Name]
</div>