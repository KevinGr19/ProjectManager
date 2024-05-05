//#region Navigation
const pages = {}
const page_loads = {}

document.querySelectorAll(".page").forEach(p => {
    pages[p.id] = p.innerHTML
    p.remove()
})

const container = document.querySelector("#container")

function navigateTo(page, args){
    closeLightbox()
    currentPage = page
    container.innerHTML = pages[page]

    if(page_loads[currentPage]) page_loads[currentPage](args)
}

function goHome(){
    navigateTo('searchpage')
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

//#region Database
var db = null
var imageCache = {}

function setupDB(){
    return new Promise((resolve, reject) => {
        let dbReq = window.indexedDB.open('projectmanager_db', 2)
        dbReq.onupgradeneeded = (e) => {
            const currDb = e.target.result
            const projectStore = currDb.createObjectStore("projects", {autoIncrement: true})
            const tagStore = currDb.createObjectStore("tags", {autoIncrement: true})
            tagStore.createIndex("name", "name", {unique: true})
            const imageStore = currDb.createObjectStore("images", {autoIncrement: true})
        }

        dbReq.onsuccess = (e) => {
            db = e.target.result
            resolve()
        }

        dbReq.onerror = (e) => {
            reject(e.target.error)
        }
    }) 
}

function getProjects(){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["projects"], "readwrite")
        const projectStore = transaction.objectStore("projects")
        const req = projectStore.openCursor()

        let projects = new Map()
        req.onsuccess = (e) => {
            let cursor = e.target.result
            if(cursor){
                projects.set(cursor.primaryKey, {
                    title: cursor.value.title,
                    tags: cursor.value.tags,
                })
                cursor.continue()
            }
            else resolve(projects)
        }
    }))
}

function getProject(id){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["projects"], "readwrite")
        const projectStore = transaction.objectStore("projects")
        const req = projectStore.get(id)

        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = (e) => reject(e.target.error)
    }))
}

function saveProject(id, json){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["projects"], "readwrite")
        const projectStore = transaction.objectStore("projects")
        const req = projectStore.put(json, id)

        req.onsuccess = resolve
        req.onerror = (e) => reject(e.target.error)
    }))
}

function getTags(){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["tags"], "readwrite")
        const tagStore = transaction.objectStore("tags")
        const req = tagStore.openCursor()

        let tags = new Map()
        req.onsuccess = (e) => {
            let cursor = e.target.result
            if(cursor){
                tags.set(cursor.primaryKey, cursor.value)
                cursor.continue()
            }
            else resolve(tags)
        }
        req.onerror = (e) => reject(e.target.error)
    }))
}

function saveImage(file){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readwrite")
        const imageStore = transaction.objectStore("images")
        const req = imageStore.add(file)

        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = (e) => reject(e.target.error)
    }))
}

function getImageURL(id){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        if(imageCache[id]){
            resolve(imageCache[id])
            return
        }

        const transaction = db.transaction(["images"], "readwrite")
        const imageStore = transaction.objectStore("images")
        const req = imageStore.get(id)

        req.onsuccess = (e) => {
            if(!e.target.result){
                resolve(null)
                return
            }
            
            imageCache[id] = URL.createObjectURL(e.target.result)
            resolve(imageCache[id])
        }
        req.onerror = (e) => reject(e.target.error)
    }))
}

const dbSetup = setupDB()
//#endregion

setTimeout(() => {
    navigateTo("projectpage", {projectId: 69})
}, 1)