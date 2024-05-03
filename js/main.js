//#region Navigation
const pages = {}
const page_loads = {}

document.querySelectorAll(".page").forEach(p => {
    pages[p.id] = p.innerHTML
    p.remove()
})

const container = document.querySelector("#container")

function navigateTo(page, args){
    currentPage = page
    container.innerHTML = pages[page]

    preloadPage()
    if(page_loads[currentPage]) page_loads[currentPage](args)
}

function goHome(){
    navigateTo('searchpage')
}

function preloadPage(){
    container.querySelectorAll("carousel").forEach(c => {
        let carousel = new Carousel(c)
    })
}
//#endregion

//#region Lightbox
const overlay = document.querySelector(".overlay")
const lightbox = overlay.querySelector("#lightbox")
let lightboxCloseAction = null

const lightboxes = {}
document.querySelectorAll(".lightbox").forEach(l => {
    lightboxes[l.id] = l.innerHTML
    l.remove()
})

function loadLightbox(id, options){
    overlay.classList.add('show')

    if(lightboxCloseAction) lightboxCloseAction()
    lightboxCloseAction = options?.onClose

    lightbox.innerHTML = lightboxes[id]
}

function closeLightbox(){
    overlay.classList.remove('show')

    if(lightboxCloseAction) lightboxCloseAction()
    lightboxCloseAction = null

    lightbox.innerHTML = ''
}

closeButton(lightbox.parentNode, closeLightbox, '15px')
//#endregion

//#region Context menu
const customContextMenu = document.querySelector("#contextmenu")

function openContextMenu(x, y, actions){
    customContextMenu.innerHTML = ''
    actions.forEach(({label, action}) => {
        let button = customContextMenu.create('li.option')
        button.innerText = label
        button.addEventListener('click', () => action())
    })

    customContextMenu.style.left = x + "px"
    customContextMenu.style.top = y + "px"
    customContextMenu.classList.remove('hide')
}

function closeContextMenu(){
    customContextMenu.classList.add('hide')
    customContextMenu.innerHTML = ''
}

document.addEventListener('click', (e) => closeContextMenu())
//#endregion

setTimeout(() => {
    navigateTo("projectpage")
    //showLightbox()
}, 1)