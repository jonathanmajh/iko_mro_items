# IKO MRO Items

**GUI tool for validating item descriptions**

Based on the minimal Electron application based on the [Quick Start Guide](https://electronjs.org/docs/tutorial/quick-start) within the Electron documentation.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/jonathanmajh/iko_mro_items.git
# Go into the repository
cd iko_mro_items
# Install dependencies
npm install
# Run the app
npm start
```
Note: Better-sqlite3 does not include prebuilt binaries for windows, this will have to be complied see [Better-Sqlite](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/troubleshooting.md) and [Working with Electron](https://github.com/JoshuaWise/better-sqlite3/issues/126)

Using
```
node v18.16.0
electron v21.4.3
better-sqlite3 v8.2.0
electron-squirrel-startup v1.0.0
xlsx v0.16.9
```

Auto updating using Nuts
https://github.com/GitbookIO/nuts

## To edit
### Editing CSS:
When linking css to an html file, use style.css as the only stylesheet. To add or edit css, edit the "style.scss" file, then compile your changes onto "style.css" This can be done using an extension such as "Live Sass Compiler" on VScode.
### Live editing:
Use ```npm start``` to open the application (make sure you've installed all dependencies using ```npm install``` at least once). Once you make any changes, hit ```ctrl+r``` in the app to refresh the page. To restart the app, enter ```rs``` in the terminal. Opening the html file in a browser directly will prevent the JS from loading.