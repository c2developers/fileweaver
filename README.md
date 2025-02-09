# 📁 FileWeaver

<div align="center">

![Version](https://img.shields.io/npm/v/fileweaver)
![Downloads](https://img.shields.io/npm/dm/fileweaver)
![License](https://img.shields.io/npm/l/fileweaver)
![Node](https://img.shields.io/node/v/fileweaver)

A powerful CLI tool for weaving files together with advanced pattern matching capabilities.

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

### Basic Usage

Concatenate all text files in the current directory:
```bash
fileweaver -r "\.txt$" -o result.txt
```

### With Headers

Include filenames as headers in the output:
```bash
fileweaver -r "\.md$" -h -o documentation.md
```

### Ignore Patterns

Concatenate all files except logs and temporary files:
```bash
fileweaver -ir "\.(log|tmp)$" -o combined.txt
```

### Custom Directory

Process files from a specific directory:
```bash
fileweaver -d ./src -r "\.js$" -o combined.js
```

## 🔍 Advanced Usage

### Nested Directories

Process files in nested directories:
```bash
fileweaver -d ./project -r "\.css$" -o styles.css
```

### Multiple Patterns

Combine multiple patterns:
```bash
fileweaver -r "\.(html|ejs)$" -ir "temp_" -o templates.html
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛟 Support

For support and questions, please [open an issue](https://github.com/yourusername/fileweaver/issues) on GitHub.

---

<div align="center">
Made with ❤️ by [Your Name]
</div>