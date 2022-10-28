# creatiocode README

This Visual Studio Code extension allows users to connect to their Creatio web project and edit code.

## Features

View code with syntax highlighting

Cache packages

See file metadata

Restore files to svn version

## Extension Settings

This extension contributes the following settings:

For FileTypes:
* ClientUnit
* SourceCode
* ProcessUserTask
* SqlScript
* Entity
* Data
* Process
* Case


* `creatiocode.fileTypes.<FileType>.Extension`: File extension for <FileType>
* `creatiocode.fileTypes.<FileType>.Enabled`: Whether to show <FileType> in file explorer

## Known Issues

* Files won't load if opened before loading is complete
* If current file is changed while loading updated version from server another file might be overwritten
* After changing settings workplace needs to be reloaded manually
* File caching might throw an error on large packages
* Sometimes metadata loads longer than expected

## Release Notes

### 0.1.0
First publish to VsCode extension marketplace

Added basic edit/save functionality. 
Added metadata view.