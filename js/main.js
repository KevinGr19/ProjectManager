//#region Navigation
const pages = {}
const page_loads = {}
const page_unloads = {}

var pageEvents = {}
let currentPage = null

document.querySelectorAll(".page").forEach(p => {
    pages[p.id] = p.innerHTML
    p.remove()
})

const container = document.querySelector("#container")

function navigateTo(page, args){
    closeLightbox()
    if(currentPage && page_unloads[currentPage]) page_unloads[currentPage]()

    currentPage = page
    container.innerHTML = pages[page]

    pageEvents = {}
    if(page_loads[currentPage]) page_loads[currentPage](args)
}

function goHome(){
    navigateTo('searchpage')
}

function dispatchPageEvent(name, data){
    if(pageEvents[name]) pageEvents[name](data)
}
//#endregion

//#region Lightbox
const overlay = document.querySelector(".overlay")
const lightbox = overlay.querySelector("#lightbox")

const lightboxes = {}
document.querySelectorAll(".lightbox").forEach(l => {
    lightboxes[l.id] = l.innerHTML
    l.remove()
})

const lightboxHistory = []

function getCurrentLightbox(){
    return lightboxHistory[lightboxHistory.length-1]
}

function refreshCurrentLightbox(){
    let lb = getCurrentLightbox()
    if(!lb){
        overlay.classList.remove('show')
        lightbox.innerHTML = ''
        return
    }
    
    overlay.classList.add('show')

    lightbox.innerHTML = lightboxes[lb.id]
    if(lb.options && lb.options.onOpen) lb.options.onOpen()
}

function loadLightbox(id, options){
    checkOnCloseLightbox()

    lightboxHistory.push({
        id: id,
        options: options
    })
    refreshCurrentLightbox()
}

function closeLightbox(){
    checkOnCloseLightbox()
    lightboxHistory.length = 0
    refreshCurrentLightbox()
}

function backLightbox(){
    checkOnCloseLightbox()
    lightboxHistory.pop()
    refreshCurrentLightbox()
}

function checkOnCloseLightbox(){
    let lb = getCurrentLightbox()
    if(lb && lb.options && lb.options.onClose) lb.options.onClose()
}

closeButton(lightbox.parentNode, () => {
    let lb = getCurrentLightbox()
    if(lb && lb.options && lb.options.backClose) backLightbox()
    else closeLightbox()
}, '15px')
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

function refreshTags(){
    let promise = dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["tags"], "readwrite")
        const tagStore = transaction.objectStore("tags")
        const req = tagStore.openCursor()

        let ids = new Set(tags.keys())
        req.onsuccess = (e) => {
            let cursor = e.target.result
            if(cursor){
                let tag = tags.get(cursor.primaryKey)
                if(tag){
                    tag.name = cursor.value.name
                    tag.color = cursor.value.color
                }
                else{
                    tags.set(cursor.primaryKey, new Tag(cursor.primaryKey, cursor.value.name, cursor.value.color))
                }
                ids.delete(cursor.primaryKey)
                cursor.continue()
            }
            else{
                ids.forEach(id => tags.delete(id))
                resolve()
            }
        }
    }))

    promise.then(() => dispatchPageEvent("tagsrefreshed"))
    return promise
}

function saveTag(json, id){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["tags"], "readwrite")
        const tagStore = transaction.objectStore("tags")
        const req = id ? tagStore.put(json, id) : tagStore.add(json)

        req.onsuccess = (e) => resolve(e.target.result)
        req.onerror = (e) => reject(e.target.error)
    }))
}

function deleteTag(id){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["tags"], "readwrite")
        const tagStore = transaction.objectStore("tags")
        
        const tReq = tagStore.delete(id)
        tReq.onsuccess = resolve
        tReq.onerror = (e) => reject(e.target.error)
    })).then(() => deleteTagFromProjects(id))
}

function deleteTagFromProjects(id){
    return dbSetup.then(() => new Promise((resolve, reject) => {
        const transaction = db.transaction(["projects"], "readwrite")
        const projectStore = transaction.objectStore("projects")
        
        const pReq = projectStore.openCursor()
        let projectEditPromises = []

        pReq.onsuccess = (e) => {
            let cursor = e.target.result
            if(cursor){
                let project = cursor.value
                if(project.tags.has(id)){
                    project.tags.delete(id)
                    projectEditPromises.push(cursor.update(project))
                }
                cursor.continue()
            }
            else Promise.all(projectEditPromises).then(() => resolve())
        }

        pReq.onerror = (e) => reject(e.target.error)
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

//#region Tags
var tags = new Map()

function editTagLB(id){
    loadLightbox("tag-edit-lightbox", {backClose: true})
    const t_title = lightbox.querySelector("#lb-tag-edit-title")
    const i_name = lightbox.querySelector("#lb-tag-edit-name")
    const i_color = lightbox.querySelector("#lb-tag-edit-color")
    const b_save = lightbox.querySelector("#lb-tag-edit-save")

    if(id){
        let oldTag = tags.get(id)
        i_name.value = oldTag.name
        i_color.value = oldTag.color
    }

    let saveWord = id ? 'Modifier' : 'Créer'
    b_save.innerText = saveWord
    t_title.innerText = `${saveWord} une étiquette`

    b_save.addEventListener('click', () => {
        b_save.disabled = true
        saveTag({name: i_name.value, color: i_color.value}, id)
            .then(res => refreshTags())
            .then(() => backLightbox())
            .catch(err => b_save.disabled = false)
    })
}
//#endregion

//#region Delete confirmation
function deleteConfirmation(prompt, onConfirm, onCancel){
    let confirmed = false
    loadLightbox("delete-confirmation", {
        onOpen: () => {
            let t_prompt = lightbox.querySelector("#lb-delete-prompt")
            let b_cancel = lightbox.querySelector("#lb-delete-cancel")
            let b_confirm = lightbox.querySelector("#lb-delete-confirm")

            t_prompt.innerHTML = prompt
            b_cancel.addEventListener('click', () => backLightbox())
            b_confirm.addEventListener('click', () => {
                if(onConfirm) onConfirm()
                confirmed = true
                backLightbox()
            })
        },
        onClose: () => {
            if(!confirmed && onCancel) onCancel()
        },
        backClose: true
    })
}
//#endregion

setTimeout(() => {
    navigateTo("projectpage", {projectId: 69})
}, 10)