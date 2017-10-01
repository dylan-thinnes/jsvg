SVGTOJS = {Converter:{}};
SVGTOJS.Converter.init = function (drawingCanvas, testingCanvas) {
	this.drawingCanvas = drawingCanvas;
	this.testingCanvas = testingCanvas;
	this.spies = {};
	this.tempLogs = [];
	this.logCall = function (propertyName, type) {
		this.tempLogs.push({
			/*Date.now(),*/
			method: propertyName, 
			type: type, 
			args: Array.from(arguments).slice(2)
		});
	}
	this.convertLogs = function (logs) {
		var data = {
			commands: [],
			methodsUsed: [],
			defaultSize: []
		}
		for (var ii = 0; ii < this.tempLogs.length; ii++) {
			var commandString = "";
			var isGet = this.tempLogs[ii].type === "set";
			//commandString += "ctx." + this.tempLogs[ii].method + (isGet ? "" : "(");
			if (isGet) {
				commandString += "ctx." + this.tempLogs[ii].method + " = '" + this.tempLogs[ii].args[0] + "';";
			} else {
				if (this.tempLogs[ii].method === "clearRect") {
					data.defaultSize[0] = this.tempLogs[ii].args[2];
					data.defaultSize[1] = this.tempLogs[ii].args[3];
				}
				var index = data.methodsUsed.indexOf(this.tempLogs[ii].method);
				if (index === -1) index = data.methodsUsed.push(this.tempLogs[ii].method) - 1;
				var funcName = "f" + index.toString();
				commandString += funcName + "(";
				for (var jj = 0; jj < this.tempLogs[ii].args.length; jj++) {
					commandString += this.tempLogs[ii].args[jj].toString() + (jj === (this.tempLogs[ii].args.length - 1) ? "" : ", ");
				}
				commandString += ");";
			}
			data.commands = this.tempLogs;
		}
		var dictionaryCommands = "var funcNames = \"" + data.methodsUsed.join(" ") + "\".split(\" \");\n" + 'for (var ii = 0; ii < funcNames.length; ii++) window["f" + ii.toString()] = ctx[funcNames[ii]].bind(ctx);';
		var resArray = ['var ctx = document.getElementById("<your canvas id here>").getContext("2d");\n', dictionaryCommands, '\nctx.save();\n', data.commands.join("\n"), "\nctx.restore();"];
		return data;
	}
	this.validateInput = function (markup) {
		try {
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(markup, "application/xml");
		} catch(err) { return false };
		if (xmlDoc.getElementsByTagName("parsererror").length > 0) return false;
		return true;
	}
	this.convertSVGQueue = [];
	this.convertSVG = function (svgCode, callback) {
		if (!this.validateInput(svgCode)) callback(undefined, "invalid svg");
		else {
			this.convertSVGQueue.push([svgCode, callback]);
			if (this.convertSVGQueue.length === 1) this.convertNextSVG();
		}
	}
	this.convertNextSVG = function () {
		this.tempLogs = [];
		canvg(document.getElementById(this.drawingCanvas), this.convertSVGQueue[0][0], {}, this);
		this.convertSVGQueue[0][1](this.convertLogs(this.tempLogs));
		if (this.convertSVGQueue.length <= 1) this.convertSVGQueue = [];
		else this.convertNextSVG();
	}
	this.init = undefined;
}


SVGTOJS.combineConvertibleFiles = function (batchFiles) {
	console.log(batchFiles);
	var output = "SVGTOJS = {\n";
	for (var ii = 0; ii < batchFiles.length; ii++) {
		output += "\"" + batchFiles[ii].id + "\": " + batchFiles[ii].getFunctionDef() + ",\n";
	}
	if (batchFiles.length === 0) {
		output += "//There is nothing in this collection of svgtojs functions, because no svgs were uploaded to create it.";
	}
	output += "}";
	return output;
} 


SVGTOJS.ConvertibleFile = function (id, parentNode, svgFileData) {
	console.log(id);
	if (parentNode !== undefined) {
		this.div = document.createElement("div");
		this.div.setAttribute("class", "file");
		this.div.innerHTML = `<input class="fileSelected" type="checkbox" name="${id}"></input><div class="fileRow"><div class="fileSVG">${id}</div><span class="fileSpacer">&gt;</span><input type="text" class="fileJS" value="${id}.js"></input></div>`;
		parentNode.appendChild(this.div);
		this.div.children[1].children[2].addEventListener("change", this.setId.bind(this, undefined));
	}
	this.setState(0);
	this.svgFileData = svgFileData;
	this.id = id;
}
SVGTOJS.ConvertibleFile.prototype.setId = function (newId) {
	console.log(newId, this.div);
	if (newId === undefined && this.div !== undefined) {
		this.id = this.div.children[1].children[2].value;
	} else this.id = newId;
}
SVGTOJS.ConvertibleFile.prototype.convert = function (callback) {
	if (this.state === 2) callback(this.jsData);
	else if (this.state === -1) return;
	else {
		this.setState(1);
		//console.log(this.svgFileData);
		window.SVGTOJS.Converter.convertSVG(this.svgFileData, this.setFileData.bind(this, callback));
	}
}
SVGTOJS.ConvertibleFile.prototype.getFunctionDef = function (methodNames, compressBit) {
	compressBit = !compressBit
	var output = "function (ctx, scaleX, scaleY) {\nvar funcNames = (\"" + this.jsData.methodsUsed.join(" ") + "\").split(\" \");\nfor (var ii = 0; ii < funcNames.length; ii++) window[\"f\" + ii.toString()] = ctx[funcNames[ii]].bind(ctx);\nctx.save();\nif (!isNaN(scaleX) && !isNaN(scaleY)) ctx.scale(scaleX, scaleY);\n";
	for (var ii = 0; ii < this.jsData.commands.length; ii++) {
		if (this.jsData.commands[ii].type === "set") {
			var argIsString = (typeof this.jsData.commands[ii].args[0] === "string") ? "\"" : "";
			var tempOutput = "ctx." + this.jsData.commands[ii].method + " = " + argIsString + this.jsData.commands[ii].args[0] + argIsString + ";\n";
		} else {
			var tempOutput = "f" + this.jsData.methodsUsed.indexOf(this.jsData.commands[ii].method).toString() + "(";
			for (var jj = 0; jj < this.jsData.commands[ii].args.length; jj++) {
				var argIsString = (typeof this.jsData.commands[ii].args[jj] === "string") ? "\"" : "";
				tempOutput += (jj === 0 ? "" : ", ") + argIsString + this.jsData.commands[ii].args[jj].toString() + argIsString;
			}
			tempOutput += ");\n";
		}
		if (compressBit) {
			tempOutput = tempOutput.replace(/(\d?\.\d{3})\d+/g, "$1");
			tempOutput = tempOutput.replace("6.283", "6.283185307179586");
			tempOutput = tempOutput.replace(/\s/g, "");
		}
		output += tempOutput;
	}
	output += "ctx.restore():\n}";
	return output;
}
SVGTOJS.ConvertibleFile.prototype.setFileData = function (callback, jsData, err) {
	this.jsData = jsData;
	if (err) {
		this.setState(-1);
		console.log("error in parsing " + this.id + ", is the entry file valid SVG?");
	} else {
		this.setState(2);
		callback(jsData);
	}
}
SVGTOJS.ConvertibleFile.prototype.setState = function (state) {
	this.state = state;
	if (this.div !== undefined) {
		if (state === -1) {
			this.div.children[1].children[1].style.backgroundColor = "#bb00bb";
			this.div.className = "errorFile";
		} else if (state === 0) this.div.children[1].children[1].style.backgroundColor = "#ff0000";
		else if (state === 1) this.div.children[1].children[1].style.backgroundColor = "#ffff00";
		else if (state === 2) this.div.children[1].children[1].style.backgroundColor = "#00ff00";
	}
}

var init = function () {
	window.SVGTOJS.Converter.init("canvgCanvas", "canvasPreview");
	window.SVGTOJS.UI = new (function () {
		this.app = document.getElementsByClassName("app")[0];
		this.view = "intro";

		//Intro & View Control
		this.setView = function (view) {
			this.app.id = view;
			this.view = view;
		}
		this.singleMode = document.getElementById("singleMode");
		this.singleMode.addEventListener("click", this.setView.bind(this, "single"));
		this.multiMode = document.getElementById("multiMode");
		this.multiMode.addEventListener("click", this.setView.bind(this, "multi"));

		this.gotoIntroFromSingle = document.getElementById("gotoIntroFromSingle");
		this.gotoIntroFromSingle.addEventListener("click", this.setView.bind(this, "intro"));
		this.gotoMultiFromSingle = document.getElementById("gotoMultiFromSingle");
		this.gotoMultiFromSingle.addEventListener("click", this.setView.bind(this, "multi"));
		this.gotoIntroFromMulti = document.getElementById("gotoIntroFromMulti");
		this.gotoIntroFromMulti.addEventListener("click", this.setView.bind(this, "intro"));
		this.gotoSingleFromMulti = document.getElementById("gotoSingleFromMulti");
		this.gotoSingleFromMulti.addEventListener("click", this.setView.bind(this, "single"));

		//Single
		this.svgCodeInput = document.getElementById("svgCodeInput");
		this.svgPreviewOutput = document.getElementById("svgPreviewOutput");
		this.jsCodeOutput = document.getElementById("jsCodeOutput");
		this.svgGetMarkup = document.getElementById("svgGetMarkup");
		this.getMarkup = function () {
			this.svgCodeInput.innerText = '<!-- This is a test markup that you can use to see the abilities of svgtojs. It should display a 2d planet  composed of two colors. This is an example made by Ryan Shappell for the solsys project by Dylan Thinnes and Aaron Shappell. -->\n<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 26.458333 26.458334"><g transform="translate(0 -270.542)"><ellipse cx="13.229" cy="283.771" rx="13.229" ry="13.229" fill="#0cf"/><path d="M4.86 286.31c-.242-.002-.495.032-.756.107-.561.16-2 .629-2.585 1.256-.43.46-.047 1.038-.356 1.522a13.232 13.232 0 0 0 2.573 3.79l.007.006c.306.315.627.614.962.896l.004.003c.784.654 1.637 1.23 2.55 1.686.084-.249-.158-.825-.029-1.202.169-.49.713-.83.79-1.426.028-.224.653-.424.722-.64.188-.58-.306-.042-.355-.666-.015-.189-.648-.205-.684-.408-.132-.736.306-1.695.255-1.973-.084-.47.202-1.238-.19-1.67-.47-.519-1.671-.677-2.356-.912-.254-.087-.267-.37-.552-.37zM13.23 270.542a13.23 13.23 0 0 0-8.223 2.865l-.002.002c-.343.273-.673.562-.987.867l-.013.012c-.31.303-.606.62-.886.952l-.015.017A13.23 13.23 0 0 0 0 283.771c.512-.667 1.025-1.11 1.529-1.432.246-.156.226 0 .49-.004.215-.003.545-.625.748-.708 1.53-.621 2.92-.71 3.646-3.736.114-.474.623-.454.725-.97.146-.748-.385-.923.065-1.513.196-.257.738.259 1.004.029.444-.384.978-1.742 1.48-2.105.928-.67 2.559-.76 3.422-1.114 1.263-.519 1.635-1.194 1.919-1.553a13.257 13.257 0 0 0-1.799-.123zM21.41 273.374c-.365.521-.728-.218-1.112 1.993-.213 1.23-1.448 2.118-2.029 3.117-.255.438.146 1.263-.42 1.412-.894.235-1.664.086-2.507.146-.806.059-1.69.33-2.27.343-1.37.027-2.028-.361-2.395.055-.315.359.308.958.442 1.847.022.147-.627.632-.812 1.014-.15.309.154.521.193.66.052.186.352.092.87-.016.185-.039.534.38 1.022.223.63-.203 1.428-.995 1.717-1.06.951-.214.579.141.688.505.405 1.356 1.692 2.868 1.27 3.947-.355.913 1.033 1.373 1.303 1.424.385.073-.153-.584.314-1.121.518-.596.703-1.441 1.337-2.071.253-.252.785.105 1.056-.113.342-.275.237-1.226.533-1.49.767-.688 1.766-.549 1.907-.228.104.237.446-.035.515.17.129.386-.06 1.209-.037 1.5.149 1.896-1.676 2.023-1.7 3.799-.003.215.295.517.312.715.025.293-.316.64-.207.868.183.385.385.882.702 1.12.212.158.779-.428 1.197-.505.378-.07.235.11.615-.056a13.236 13.236 0 0 0 2.544-7.801 13.243 13.243 0 0 0-5.049-10.397z" fill="#c87137"/><path d="M10.178 275.164c.05.277.122-.061.487.118.134.065.283.388.532.546.233.149.565.129.75.299.155.142-.036.32.16.419.234.117.635.34 1.106.367.327.02.722-.154.97-.114.423.067.401.326.671.26.656-.165.8-.182.984-.787.05-.164-.514-.232-.542-.489-.027-.25.158-.07.152-.36-.005-.296-.582-.803-.73-1.166-.107-.261.248-.42.075-.5-.723-.33-1.504 1.016-2.101 1.34-.135.073-.08-.24-.205-.276a2.6 2.6 0 0 1-1-.522c-.263-.205-.073-.23-.36-.422-.287-.19-.454-.084-.586.056-.183.192-.118.582-.197.807-.033.108-.216.148-.165.424zM14.943 294.211a.376.376 0 0 0-.158.06c-.504.307-.604.202-.882.77-.279.566.14.518-.117.913-.12.184-.028.587-.322.672-.295.086-.876-.035-1.026.35.265.022.526.019.791.024a13.24 13.24 0 0 0 6.464-1.687c-.616.011-.946-.247-1.19-.17-.285.09-.613.285-.774.165-.174-.13-.435-.173-.44-.32-.004-.136.24-.374.333-.569.192-.402-1.94.107-2.237.303-.261.17-.139-.537-.442-.511zM9.085 290.978c-.047-.037.037-.105.03-.175-.006-.068-.076-.197-.068-.275.017-.18.144-.313.249-.392.197-.147.39.12.608.024.142-.063.338-.25.44-.415.056-.09-.014-.214.086-.217.203-.006.36.172.47.388.044.088.193.184.138.267-.105.16-.225.089-.304.184-.195.235-.383.543-.584.564-.166.018-.093-.05-.16-.129-.049-.055-.237-.128-.32-.128-.049 0-.065.086-.112.125a.759.759 0 0 1-.473.18z" fill="#c87137"/></g></svg>';
		}
		this.submitSVGCodeInput = function (e) {
			//console.log(this.svgCodeInput.innerText);
			//window.SVGTOJS.Converter.convertSVG.call(window.SVGTOJS.Converter, this.svgCodeInput.innerText, this.writeJsCodeOutput.bind(this));
			console.log("submitSVGCodeInput called.");
			this.singleFile = new SVGTOJS.ConvertibleFile("singleFile", undefined, this.svgCodeInput.innerText);
			this.singleFile.convert(this.writeJsCodeOutput.bind(this));
		}
		this.writeJsCodeOutput = function (codeOutput) {
			//if (err) this.jsCodeOutput = "error with parsing xml input, is the input legitimate xml?";
			//else this.jsCodeOutput.innerText = codeOutput.join("");
			this.jsCodeOutput.innerText = this.singleFile.getFunctionDef();
		}
		this.previewSVGCodeInput = function (e) {
			//console.log(this.svgPreviewOutput.innerHTML, this.svgCodeInput.innerText);
			this.svgPreviewOutput.innerHTML = this.svgCodeInput.innerText;
		}
		this.svgUpload = document.getElementById("svgUpload");
		this.svgPreview = document.getElementById("svgPreview");
		this.svgGetMarkup.addEventListener("click", this.getMarkup.bind(this));
		this.svgPreview.addEventListener("click", this.previewSVGCodeInput.bind(this));
		this.svgSubmit = document.getElementById("svgSubmit");
		this.svgSubmit.addEventListener("click", this.submitSVGCodeInput.bind(this));
		this.jsDownload = document.getElementById("jsDownload");
		this.testJsHandler = function () {
			//console.log("Calling testJsHandler.");
			if (this.singleFile == undefined) return;
			var canvasPreview = document.getElementById("canvasPreview");
			canvasPreview.setAttribute("width", this.singleFile.jsData.defaultSize[0] + "px");
			canvasPreview.setAttribute("height", this.singleFile.jsData.defaultSize[1] + "px");
			canvasPreview.style.width = this.singleFile.jsData.defaultSize[0] + "px";
			canvasPreview.style.height = this.singleFile.jsData.defaultSize[1] + "px";
			var ctx = canvasPreview.getContext("2d");
			for (var ii = 0; ii < this.singleFile.jsData.commands.length; ii++) {
				//console.log(this.singleFile.jsData.commands[ii], ctx[this.singleFile.jsData.commands[ii].method]);
				if (this.singleFile.jsData.commands[ii].type === "set") ctx[this.singleFile.jsData.commands[ii].method] = this.singleFile.jsData.commands[ii].args[0];
				else ctx[this.singleFile.jsData.commands[ii].method].apply(ctx, this.singleFile.jsData.commands[ii].args);
			}
		}
		this.jsTest = document.getElementById("jsTest");
		this.jsTest.addEventListener("click", this.testJsHandler.bind(this));

		//Multi
		this.batchAutoConvert = document.getElementById("batchAutoConvert")
		this.isBatchAutoConvert = function () {
			return this.batchAutoConvert.checked;
		}
		this.batchFiles = [];
		this.createFile = function (id, svgData) {
			this.batchFiles[id] = new SVGTOJS.ConvertibleFile(id, this.fileList, svgData);
			if (this.isBatchAutoConvert()) this.batchFiles[id].convert(function () {});
		}
		this.batchReadOutput = function (name, e) {
			this.createFile(name, e.target.result);
		}
		this.batchRead = function (e) {
			var fileList = e.target.files;
			var fileListLength = fileList.length;
			for (var ii = 0; ii < fileListLength; ii++) {
				if (this.batchFiles[fileList[ii].name] === undefined) {
					var fileReader = new FileReader();
					fileReader.addEventListener("load", this.batchReadOutput.bind(this, fileList[ii].name));
					fileReader.readAsText(fileList[ii]);
				}
			}
		}
		this.batchUpload = document.getElementById("batchUpload");
		this.batchUpload.addEventListener("change", this.batchRead.bind(this));
		
		this.batchConvert = document.getElementById("batchConvert");
		this.batchConvert.addEventListener("click", (function () {
			var checkedFiles = this.getCheckedFiles();
			for (var ii = 0; ii < checkedFiles.length; ii++) {
				this.batchFiles[checkedFiles[ii][0]].convert(console.log);
			}
		}).bind(this));	
		this.fileList = document.getElementById("fileList");
		/*this.batchConvert = document.getElementById("batchConvert");
		this.batchConvertClick = function () {
			console.log("converting batch...", this.batchFiles);
			for (var file in this.batchFiles) {
				console.log("converting file " + file);
				this.batchFiles[file].convert(console.log);
			}
		}
		this.batchConvert.addEventListener("click", this.batchConvertClick.bind(this));*/
		this.checkAll = document.getElementById("checkAll");
		this.checkAllClick = function () {
			var files = document.getElementsByClassName("file");
			var allAreChecked = true;
			for (var ii = 1; ii < files.length; ii++) {
				if (files[ii].children[0].checked === false) {
					allAreChecked = false;
					break;
				}
			}
			if (allAreChecked === true) {
				this.checkAll.checked = false;
				for (var ii = 1; ii < files.length; ii++) {
					files[ii].children[0].checked = false;
				}
			} else {
				this.checkAll.checked = true;
				for (var ii = 1; ii < files.length; ii++) {
					files[ii].children[0].checked = true;
				}
			}
			
		}
		this.checkAll.addEventListener("click", this.checkAllClick.bind(this));
		this.getCheckedFiles = function () {
			var files = document.getElementsByClassName("file");
			var checkedFiles = [];
			for (var ii = 1; ii < files.length; ii++) {
				if (files[ii].children[0].checked === true) {
					/*var batchFile = this.batchFiles[files[ii].children[0].getAttribute("name")];
					if (batchFile !== undefined && batchFile.state == 2) {*/
						checkedFiles.push([files[ii].children[0].getAttribute("name"), files[ii].children[1].children[2].value]);
					/*} else {
						files[ii].children[0].checked = false;
					}*/
				}
			}
			return checkedFiles;
		}
		this.getFileName = function () {
			return document.getElementById("batchFileName").value;
		}
		this.batchDownload = document.getElementById("batchDownload");
		this.batchDownloadHandler = function () {
			var checkedFiles = this.getCheckedFiles();
			var downloadableFiles = [];
			for (var ii = 0; ii < checkedFiles.length; ii++) {
				var batchFile = this.batchFiles[checkedFiles[ii][0]];
				console.log(batchFile);
				if (batchFile !== undefined && batchFile.state === 2) {
					downloadableFiles.push(batchFile);
				} else if (batchFile !== undefined && batchFile.state !== 2) {
					batchFile.div.children[0].checked = false;
				}
			}
			if (downloadableFiles.length === 0) return alert("There is nothing in your selection that is downloadable! Are they all converted?");
			//console.log(downloadableFiles, SVGTOJS.combineConvertibleFiles(downloadableFiles));
			else {
				var blob = new Blob([SVGTOJS.combineConvertibleFiles(downloadableFiles)], {type: "text/plain;charset=utf-8"});
				saveAs(blob, this.getFileName());
			}
		}
		this.batchDownload.addEventListener("click", this.batchDownloadHandler.bind(this));
		
		//Setup
		this.setView("intro");
	})();
}
