SVGTOJS = {Converter:{}};
SVGTOJS.Converter.init = function (drawingCanvas, testingCanvas) {
	this.drawingCanvas = drawingCanvas;
	this.testingCanvas = testingCanvas;
	this.spies = {};
	this.logs = [];
	this.logCall = function (propertyName, type) {
		this.logs.push([
			Date.now(), 
			propertyName, 
			type, 
			Array.from(arguments).slice(2)
		]);
	}
	this.convertLogs = function () {
		var commands = [];
		var methodDictionary = [];
		for (var ii = 0; ii < this.logs.length; ii++) {
			var commandString = "";
			var isGet = this.logs[ii][2] === "set";
			//commandString += "ctx." + this.logs[ii][1] + (isGet ? "" : "(");
			if (isGet) {
				commandString += "ctx." + this.logs[ii][1] + " = '" + this.logs[ii][3][0] + "';";
			} else {
				var index = methodDictionary.indexOf(this.logs[ii][1]);
				if (index === -1) index = methodDictionary.push(this.logs[ii][1]) - 1;
				var funcName = "f" + index.toString();
				commandString += funcName + "(";
				for (var jj = 0; jj < this.logs[ii][3].length; jj++) {
					commandString += this.logs[ii][3][jj].toString() + (jj === (this.logs[ii][3].length - 1) ? "" : ", ");
				}
				commandString += ");";
			}
			commands[ii] = commandString;
		}
		var dictionaryCommands = "var funcNames = \"" + methodDictionary.join(" ") + "\".split(\" \");\n" + 'for (var ii = 0; ii < funcNames.length; ii++) window["f" + ii.toString()] = ctx[funcNames[ii]].bind(ctx);';
		var resArray = ['var ctx = document.getElementById("<your canvas id here>").getContext("2d");\n', dictionaryCommands, '\nctx.save();\n', commands.join("\n"), "\nctx.restore();"];
		resArray[3] = resArray[3].replace(/(\d?\.\d{3})\d+/g, "$1");
		resArray[3] = resArray[3].replace("6.283", "6.283185307179586");
		resArray[3] = resArray[3].replace(/\s/g, "");
		return resArray;
	}
	this.getSize = function () {
		var width = 0;
		var height = 0;
		for (var ii = 0; ii < this.logs.length; ii++) {
			if (this.logs[ii][1] === "clearRect") {
				width = parseInt(this.logs[ii][3][2]);
				height = parseInt(this.logs[ii][3][3]);
				break;
			}
		}
		return [width, height];
	}
	this.currJS = [];
	this.testJS = function () {
		var sanitizedJS = this.currJS.slice(0);
		var dimensions = this.getSize(this.logs);
		var canvasPreview = document.getElementById(this.testingCanvas);
		canvasPreview.setAttribute("width", dimensions[0] + "px");
		canvasPreview.setAttribute("height", dimensions[1] + "px");
		canvasPreview.style.width = dimensions[0] + "px";
		canvasPreview.style.height = dimensions[1] + "px";
		sanitizedJS[0] = 'var ctx = document.getElementById("canvasPreview").getContext("2d");\n'
		sanitizedJS = sanitizedJS.join("");
		eval(sanitizedJS);
	}
	this.validateInput = function (markup) {
		try {
			var parser = new DOMParser();
			var xmlDoc = parser.parseFromString(markup, "application/xml");
		} catch(err) { return false };
		if (xmlDoc.getElementsByTagName("parsererror").length>0) return false;
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
		canvg(document.getElementById(this.drawingCanvas), this.convertSVGQueue[0][0], {}, this);
		this.currJS = this.convertLogs(this.logs);
		//console.log(this.currJS);
		this.convertSVGQueue[0][1](this.currJS);
		if (this.convertSVGQueue.length <= 1) this.convertSVGQueue = [];
		else this.convertNextSVG();
	}
	this.init = undefined;
};

SVGTOJS.BatchFile = function (id, parentNode, svgFileData) {
	this.div = document.createElement("div");
	this.div.setAttribute("class", "file");
	this.div.innerHTML = `<input class="fileSelected" type="checkbox" name="${id}"></input><div class="fileRow"><div class="fileSVG">${id}</div><span class="fileSpacer">&gt;</span><input type="text" class="fileJS" value="${id}.js"></input></div>`;
	parentNode.appendChild(this.div);
	this.setState(0);
	this.svgFileData = svgFileData;
	this.id = id;
}
SVGTOJS.BatchFile.prototype.convert = function (callback) {
	if (this.state === 2) callback(this.jsFileData);
	else if (this.state === -1) return;
	else {
		this.setState(1);
		window.SVGTOJS.Converter.convertSVG(this.svgFileData, (function (jsFileData, err) {
			if (err) {
				this.setState(-1);
				console.log("error in parsing " + this.id + ", is the entry file valid SVG?");
			} else {
				this.setJsFileData(jsFileData);
				callback(jsFileData);
			}
		}).bind(this));
	}
}
SVGTOJS.BatchFile.prototype.setJsFileData = function (jsFileData) {
	this.jsFileData = jsFileData;
	this.setState(2);
}
SVGTOJS.BatchFile.prototype.setState = function (state) {
	this.state = state;
	if (state === -1) this.div.children[1].children[1].style.backgroundColor = "#880088";
	else if (state === 0) this.div.children[1].children[1].style.backgroundColor = "#ff0000";
	else if (state === 1) this.div.children[1].children[1].style.backgroundColor = "#ffff00";
	else if (state === 2) this.div.children[1].children[1].style.backgroundColor = "#00ff00";
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
			window.SVGTOJS.Converter.convertSVG.call(window.SVGTOJS.Converter, this.svgCodeInput.innerText, this.writeJSCodeOutput.bind(this));
		}
		this.writeJSCodeOutput = function (codeOutput, err) {
			if (err) this.jsCodeOutput = "error with parsing xml input, is the input legitimate xml?";
			else this.jsCodeOutput.innerText = codeOutput.join("");
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
		this.jsTest = document.getElementById("jsTest");
		this.jsTest.addEventListener("click", window.SVGTOJS.Converter.testJS.bind(window.SVGTOJS.Converter));

		//Multi
		this.batchFiles = [];
		this.createFile = function (id, svgData) {
			this.batchFiles[id] = new SVGTOJS.BatchFile(id, this.fileList, svgData);
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
		
		this.fileList = document.getElementById("fileList");
		
		//Setup
		this.setView("intro");
	})();
}
