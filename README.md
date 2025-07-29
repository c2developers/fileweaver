# 📁 FileWeaver

<div align="center">

![Version](https://img.shields.io/npm/v/fileweaver)
![Downloads](https://img.shields.io/npm/dm/fileweaver)
![License](https://img.shields.io/npm/l/fileweaver)
![Node](https://img.shields.io/node/v/fileweaver)

A powerful CLI tool for weaving files together with advanced pattern matching capabilities, featuring smart import following, content minification, visual progress and tree view of processed files.

[Installation](#installation) •
[Usage](#usage) •
[Examples](#examples) •
[Contributing](#contributing)

</div>

## ✨ Features

- 🔍 **Regex Pattern Matching**: Filter files using regular expressions
- 🚫 **Exclusion Patterns**: Ignore files that match specific patterns
- 📂 **Directory Support**: Process files from any directory
- 🔗 **Smart Import Following**: Follow imports from multiple entry files automatically
- 📑 **File Headers**: Option to include original filenames in the output
- 🎯 **Flexible Output**: Specify custom output location and filename
- 🌳 **Tree View**: Visual representation of processed files with optional inclusion in output
- 📊 **Progress Bar**: Real-time processing visualization
- 🎨 **Colored Output**: Enhanced readability with color-coded messages
- 📝 **Custom Prompts**: Add custom prompts to the output file
- 🗂️ **Directory Tree**: Include directory structure in the output file
- ⚡ **Content Minification**: Aggressive minification by default with customizable levels
- 📈 **Compression Statistics**: View before/after file size statistics
- 🔄 **Multi-Entry Support**: Process multiple entry files simultaneously
- 🎚️ **Depth Control**: Control how deep to follow import chains

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
| `-f, --follow-imports <files...>` | Follow imports from entry files (multiple files supported) | - |
| `--max-depth <number>` | Maximum depth for following imports | Unlimited |
| `-h, --headers` | Add file headers to content | false |
| `-o, --output <file>` | Output file name | output.txt |
| `-t, --tree` | Include directory tree in output file | false |
| `-p, --prompt <text>` | Add custom prompt to output file | - |
| `-m, --minify [level]` | Minify content (light\|medium\|aggressive) | aggressive |
| `--stats` | Show compression statistics | false |
| `--version` | Show version number | - |
| `--help` | Show help | - |

## 📋 Examples

### Smart Import Following (New!)

Follow imports from a single entry file:
```bash
fileweaver -f src/main.js -o bundle.js
```

Follow imports from multiple entry files:
```bash
fileweaver -f src/main.js src/app.js src/utils/index.js -o combined.js
```

With depth control and statistics:
```bash
fileweaver -f src/main.js --max-depth 5 --stats -o bundle.js
```

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

### Content Minification (New!)

Aggressive minification (default):
```bash
fileweaver -f src/main.js -o minified.js
```

Custom minification level:
```bash
fileweaver -f src/main.js -m light -o bundle.js
fileweaver -d ./src -r "\.js$" -m medium -o bundle.js
```

With compression statistics:
```bash
fileweaver -f src/main.js --stats -o bundle.js
```

Output will show:
```
Compression Statistics:
Original size: 45,821 bytes
Minified size: 31,247 bytes
Reduction: 14,574 bytes (31.8%)
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
fileweaver -d ./src -r "\.(js|ts)$" -h true -t true -p "Review this code" -m medium -o bundle.js
```

This will:
- Process all .js and .ts files
- Add headers for each file
- Include the directory tree
- Add the specified prompt
- Use medium minification
- Save everything to bundle.js

### Advanced Import Following

Process React application with TypeScript:
```bash
fileweaver -f src/App.tsx src/index.tsx --max-depth 10 --stats -h true -o react-bundle.js
```

Process multiple library entry points:
```bash
fileweaver -f lib/index.js lib/utils.js lib/components/index.js -m aggressive --stats -o library.js
```

### Process Multiple File Types

```bash
fileweaver -d ./src -r "\.(js|ts)$" -h true -m light -o bundle.js
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
fileweaver -d . -r "\.js$" -ir "node_modules|dist|test" -m aggressive -o prod.js
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
// Minified main file content here...

==================================================
File: src/config.js
==================================================
// Minified config file content here...
```

## 🔍 Advanced Usage

### Complete Project Bundle with Import Following

Bundle an entire project following all imports with statistics:
```bash
fileweaver -f src/index.js -h true -t true --stats -p "Complete project bundle" -o project-bundle.js
```

### Multi-Entry Library Processing

Process multiple library entry points with controlled depth:
```bash
fileweaver -f lib/core.js lib/plugins.js lib/utils.js --max-depth 3 -m aggressive --stats -o library.min.js
```

### Nested Directories with Tree and Prompt

Process files in nested directories, include tree structure, and add a processing prompt:
```bash
fileweaver -d ./project -r "\.css$" -ir "vendor|temp" -t true -p "Combine all CSS files" -m medium -o styles.css
```

### Complex Pattern Matching with Custom Output

```bash
fileweaver -r "\.(html|ejs)$" -ir "temp_|draft_" -h true -t true -m light -o templates.html
```

## 🆕 What's New in v1.4.1

- **Multi-Entry Import Following**: Support for multiple entry files with `-f`
- **Aggressive Minification**: Now enabled by default for better compression
- **Compression Statistics**: View file size reduction with `--stats`
- **Depth Control**: Control import following depth with `--max-depth`
- **Improved Error Handling**: Better handling of missing or invalid entry files
- **Enhanced Progress Display**: More detailed processing information

## 💡 Use Cases

### Frontend Development
```bash
# Bundle React components with their dependencies
fileweaver -f src/components/App.jsx src/components/Layout.jsx --stats -o components.js

# Process CSS with imports
fileweaver -f src/styles/main.css --max-depth 5 -m medium -o bundle.css
```

### Backend Development
```bash
# Bundle Node.js modules
fileweaver -f src/server.js src/routes/index.js --max-depth 8 --stats -o server-bundle.js

# Process utility libraries  
fileweaver -f lib/utils.js lib/helpers.js lib/validators.js -m aggressive -o utils.min.js
```

### Documentation
```bash
# Combine markdown files with tree structure
fileweaver -d ./docs -r "\.md$" -t true -p "Complete documentation" -m light -o README.md
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