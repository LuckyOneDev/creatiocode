# creatiocode README

This Visual Studio Code extension allows users to connect to their Creatio web project and edit code.

## Features

View code with syntax highlighting

Cache packages

See file metadata

Restore files to svn version

Generate inheritance trees  (for js files)

## Known Issues

* If current file is changed while loading updated version from server another file might be overwritten
* File info and inheritance need to be reopened once to work propetly 
* After changing settings workplace needs to be reloaded manually
* File caching might throw an error on larger packages

## Release Notes

### 0.1.0
First publish to VsCode extension marketplace

Added basic edit/save functionality. 
Added metadata view.

### 0.2.0
Added inheritance view

### 0.2.1
Added reconnect policy

### 0.2.2
Overall improvements to stability