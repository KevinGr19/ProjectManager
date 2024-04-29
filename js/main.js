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

function showLightbox(){
    overlay.classList.add('show')
}

function hideLightbox(){
    overlay.classList.remove('show')
}

const lightboxes = {}
document.querySelectorAll(".lightbox").forEach(l => {
    lightboxes[l.id] = l.innerHTML
    l.remove()
})

function loadLightbox(id){
    showLightbox()
    lightbox.innerHTML = lightboxes[id]
}

closeButton(lightbox.parentNode, hideLightbox, '15px')
//#endregion

setTimeout(() => {
    navigateTo("projectpage")
    //showLightbox()
}, 1)