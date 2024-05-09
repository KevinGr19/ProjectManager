HTMLElement.prototype.create = function(selector){
	let end = selector.length;
	let type = selector.match(/^[a-zA-Z0-9]+/);
	let innerHTML = selector.match(/>.+$/);

	let element = document.createElement(type);
	if(innerHTML){
		end = innerHTML.index;
		element.innerHTML = innerHTML[0].substring(1);
	}

	selector = selector.substring(0, end);
	let modifiers = [...selector.matchAll(/\[.+=["'].+["']\]/g)];
	
	for(const mod of modifiers){
		let part = mod[0].substring(1, mod[0].length-2);
		let sep = part.indexOf('=');
		let prop = part.substring(0, sep);
		let val = part.substring(sep+2, part.length);

		element.setAttribute(prop, val);
		selector = selector.substring(0, mod.index) + ' '.repeat(mod[0].length) + selector.substring(mod.index+mod[0].length,selector.length);
	}

	let classes = [...selector.matchAll(/\.[a-zA-Z0-9_-]+/g)];
	for(const c of classes) element.classList.add(c[0].substring(1));

	let id = selector.match(/#[a-zA-Z0-9]+/);
	if(id) element.id = id[0].substring(1);

	this.appendChild(element);
	return element;
}

function imgCorner(parent, onclick, {src, alt, width, height}){
	let button = parent.create('div.corner.smar')
	let img = button.create('img')

	button.style.width = width ?? '15px'
	if(height) button.style.height = height

	img.setAttribute('src', src)
	img.setAttribute('alt', alt)

	button.onclick = onclick
	return button
}

if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) { 
		return typeof args[number] != 'undefined'
			? args[number]
			: match
		;
		});
	};
}

function closeButton(parent, onclick, size){
	return imgCorner(parent, onclick, {
		src: "assets/img/x.png",
		alt: "Fermer",
		width: size})
}

let months = [
	'janvier','février','mars','avril',
	'mai','juin','juillet','août',
	'septembre','octobre','novembre','décembre'
]
function dateToText(date){
	if(!date) return null
	return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} à ${date.getHours().toString().padStart(2, '0')}h${date.getMinutes().toString().padStart(2, '0')}`
}

function arrayCompare(col1, col2, func){
	if(col1.length != col2.length) return false
	for(let i in col1) if(!func(col1[i], col2[i])) return false
	return true
}

function getElementAfterDragged(container, y){
	for(let child of container.children){
		if(child.classList.contains('dragging')) continue
		let box = child.getBoundingClientRect()

		if(y < box.top + box.height/2) return child
	}
	return null
}

function setUndraggable(element){
	element.setAttribute('draggable', true)
	element.addEventListener('dragstart', e => {
		e.preventDefault()
		e.stopPropagation()
	})
}