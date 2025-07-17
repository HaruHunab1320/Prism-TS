# Installing Prism Language Support in VS Code

## Quick Install (Recommended)

1. Open VS Code
2. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
3. Run: `Developer: Install Extension from Location...`
4. Navigate to: `/Users/jakobgrant/Workspaces/Prism-TS/vscode-extension/prism-lang`
5. Click "Install"
6. Restart VS Code

## Manual Install

1. Copy the extension folder:
   ```bash
   # macOS/Linux
   cp -r /Users/jakobgrant/Workspaces/Prism-TS/vscode-extension/prism-lang ~/.vscode/extensions/
   
   # Windows (in PowerShell)
   Copy-Item -Path "path\to\prism-lang" -Destination "$env:USERPROFILE\.vscode\extensions\" -Recurse
   ```

2. Restart VS Code

## Verify Installation

1. Create a new file with `.prism` extension
2. Type some Prism code:
   ```prism
   value = 42 ~> 0.9
   result = llm("Hello AI!")
   ```
3. You should see syntax highlighting with:
   - Blue confidence operators (`~>`)
   - Purple function calls (`llm`)
   - Colored keywords

## Apply Prism Theme (Optional)

1. Open Command Palette (`Cmd+K Cmd+T`)
2. Select "Prism Dark" or "Prism Light"

## Troubleshooting

If highlighting doesn't work:
1. Check that the file has `.prism` extension
2. Reload VS Code window (`Cmd+R` or `Ctrl+R`)
3. Check Output panel for any errors

## Publishing to Marketplace (Future)

To publish this extension to the VS Code Marketplace:

1. Install vsce: `npm install -g vsce`
2. Create a publisher account at https://marketplace.visualstudio.com
3. Package: `vsce package`
4. Publish: `vsce publish`