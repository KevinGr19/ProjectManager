//#region Data utils
class Watcher{

    constructor(){
        this.handlers = {}
    }

    static toWatcherProxy(object){
        if(object.isWatcherProxy) return object
        object.isWatcherProxy = true

        return new Proxy(object, {
            set(o, prop, val){
                o[prop] = val
                if(o.watcher) o.watcher.call(prop, val)
                return true
            }
        })
    }

    call(prop, value){
        if(this.handlers[prop]) Object.values(this.handlers[prop]).forEach(h => h(value))
    }

    listen(prop, listener_id, action){
        this.handlers[prop] ??= {}
        this.handlers[prop][listener_id] = action
    }

    remove(prop, listener_id){
        if(listener_id === undefined) delete this.handlers[prop]
        else if(this.handlers[prop]) delete this.handlers[prop][listener_id]
    }

}
//#endregion

//#region Data
class Project{

    constructor(){
        this.title = ""
        this.description = ""
        this.createdAt = null
        this.modifiedAt = null
        this.images = []
        this.tasks = []
        this.tags = []

        this.watcher = new Watcher()
    }

    getRatio(){
        if(!this.tasks) return null;
        return this.tasks.reduce((p,c) => c.finished ? p+1 : p, 0)/this.tasks.length
    }

    clone(){
        let newProject = new Project()
        newProject.title =  this.title
        newProject.description =  this.description
        newProject.createdAt =  this.createdAt
        newProject.modifiedAt =  this.modifiedAt
        newProject.images = [...this.images]
        newProject.tasks = this.tasks.map(t => t.clone())
        newProject.tags = this.tags.map(t => t.clone())

        return newProject
    }

}

class Tag{

    constructor(name, color){
        this.name = name ?? ""
        this.color = color ?? ""
    }

    toHTML(){
        let element = document.createElement('div')
        element.classList.add('etiquette')
        element.innerText = this.name
        element.style.backgroundColor = this.color
        return element
    }

    clone(){
        return new Tag(this.name, this.color)
    }

}

class AbstractTask{

    constructor(){
        this.id = ""
        this.name = ""
        this.createdAt = null
        this.modifiedAt = null
        this.finished = false
        this.finishedAt = null

        this.watcher = new Watcher()
    }

    get canShowDate(){
        return (this.finished && this.finishedAt);
    }

}

class Task extends AbstractTask{

    constructor(project){
        super()
        this.project = project
        this.description = ""
        this.subtasks = []
    }

    getDoneSubtasks(){
        return this.subtasks.reduce((p,c) => c.finished ? p+1 : p, 0)
    }

    clone(){
        let newTask = new Task(this.project)
        newTask.id = this.id
        newTask.name = this.name
        newTask.createdAt = this.createdAt
        newTask.modifiedAt = this.modifiedAt
        newTask.finished = this.finished
        newTask.finishedAt = this.finishedAt
        newTask.description = this.description
        newTask.subtasks = this.subtasks.map(t => t.clone())

        return newTask
    }

}

class SubTask extends AbstractTask{

    constructor(task){
        super()
        this.task = task
    }

    clone(){
        let newTask = new SubTask(this.task)
        newTask.id = this.id
        newTask.name = this.name
        newTask.createdAt = this.createdAt
        newTask.modifiedAt = this.modifiedAt
        newTask.finished = this.finished
        newTask.finishedAt = this.finishedAt

        return newTask
    }

}
//#endregion

//#region View models
class ProjectVM{

    constructor(parent, project){
        this.project = project

        this.bigtitle = parent.querySelector(".title")
        this.titleInput = parent.querySelector("#titre-projet")
        this.descriptionInput = parent.querySelector("#description-projet")
        this.createdAt = parent.querySelector("#created-projet")
        this.modifiedAt = parent.querySelector("#modified-projet")

        this.titleInput.addEventListener('change', e => this.project.title = e.currentTarget.value)
        this.descriptionInput.addEventListener('change', e => this.project.description = e.currentTarget.value)

        this.taskCounter = parent.querySelector("#taches-compteur")
        this.buttonAjout = parent.querySelector("#taches-ajout")

        this.divEtiquettes = parent.querySelector("#etiquettes-projet")
        this.divProgressbar = parent.querySelector("#progressbar")
        this.progressbarFill = this.divProgressbar.querySelector("span")
        this.textProgressbar = parent.querySelector("#text-progressbar")
        this.divTaches = parent.querySelector("#taches-projet")

        this.addWatchers()
    }
    
    updateProgressbar(){
        let ratio = this.project.getRatio()
        if(ratio === null){
            this.divProgressbar.classList.add('hide')
        }
        else{
            this.divProgressbar.classList.remove('hide')
            
            let percentage = Math.round(ratio * 100)
            this.textProgressbar.innerText = this.divProgressbar.style.width = `${percentage}%`
        }
    }

    update(){
        this.updateTitle()
        this.updateDescription()
        this.updateDates()
        this.updateTaskCounter()
        this.updateEtiquettes()
    }

    updateTitle(){
        this.bigtitle.innerText = this.titleInput.value = this.project.title
    }

    updateDescription(){
        this.descriptionInput.value = this.project.description
    }

    updateTaskCounter(){
        this.taskCounter.innerText = `${this.project.tasks.length} tâches`
    }

    updateDates(){
        this.createdAt.innerText = dateToText(this.project.createdAt)
        this.modifiedAt.innerText = dateToText(this.project.modifiedAt)
    }

    updateEtiquettes(){
        this.divEtiquettes.innerHTML = ''
        if(this.project.tags) this.project.tags.forEach(t => this.divEtiquettes.appendChild(t.toHTML()))
        else this.divEtiquettes.innerText = 'Aucune'
    }

    setReadOnly(state){
        this.titleInput.toggleAttribute('readonly', state)
        this.descriptionInput.toggleAttribute('readonly', state)
        this.buttonAjout.classList.toggle('hide', state)
    }

    addWatchers(){
        this.project.watcher.listen('title', 'page', () => this.updateTitle())
        this.project.watcher.listen('description', 'page', () => this.updateDescription())
        this.project.watcher.listen('createdAt', 'page', () => this.updateDates())
        this.project.watcher.listen('modifiedAt', 'page', () => this.updateDates())
    }

}

class TaskVM{

    constructor(parent, task){
        this.task = task

        this.root = parent.create("div.tache")
        
        this.header = this.root.create('div.tache_header')
        this.numero = this.header.create('p.numero')
        this.enonce = this.header.create('p.enonce')
        
        this.checkbox = this.header.create('input[type="checkbox"].checkbox')
        this.date = this.root.create('p.date')

        this.checkbox.addEventListener('change', e => this.task.finished = e.currentTarget.checked)
        this.checkbox.addEventListener('click', e => {
            e.stopPropagation()
        })

        this.addWatchers()
    }

    update(){
        this.updateId()
        this.updateName()
        this.updateFinished()
    }

    updateId(){
        this.numero.innerText = `#${this.task.id}`
    }

    updateName(){
        this.enonce.innerText = this.task.name
    }

    updateFinished(){
        this.checkbox.checked = this.task.finished

        this.date.classList.toggle('hide', !this.task.canShowDate)
        this.date.innerText = `Fini le ${dateToText(this.task.finishedAt)}`

        this.root.toggleAttribute('finished', this.task.finished)
    }

    addWatchers(){
        this.task.watcher.listen('id', 'bar', () => this.updateId())
        this.task.watcher.listen('name', 'bar', () => this.updateName())
        this.task.watcher.listen('finished', 'bar', () => this.updateFinished())
        this.task.watcher.listen('finishedAt', 'bar', () => this.updateFinished())
    }

}

class SubTaskVM extends TaskVM{

    constructor(parent, task){
        super(parent, task)

        this.nameInput = this.header.create('input[type="text"].enonce.novpad')
        this.nameInput.addEventListener('change', e => this.task.name = e.currentTarget.value)

        this.header.insertBefore(this.nameInput, this.checkbox)
    }

    updateName(){
        super.updateName()
        this.nameInput.value = this.task.name
    }

    setReadOnly(state){
        this.enonce.classList.toggle('hide', !state)
        this.nameInput.classList.toggle('hide', state)
    }

}

class MainTaskVM extends TaskVM{

    constructor(parent, task){
        super(parent, task)
        this.compteur = this.header.create('p.compteur')
        this.checkbox.parentNode.appendChild(this.checkbox)
    }

    update(){
        super.update()
        this.updateCounter()
    }

    updateCounter(){
        this.compteur.innerText = this.task.subtasks.length > 0 ?
             `${this.task.getDoneSubtasks()}/${this.task.subtasks.length}` : ''
    }

    addWatchers(){
        super.addWatchers()
    }

}

class TaskLightboxVM{

    constructor(parent, task, taskVM){
        this.task = task
        this.id = task.id

        this.taskVM = taskVM

        this.title = parent.querySelector('#lb-tache-title')
        this.checkbox = parent.querySelector('#lb-tache-finished')
        this.date = parent.querySelector('#lb-tache-finishedAt')

        this.checkbox.addEventListener('change', e => this.task.finished = e.currentTarget.checked)
        
        this.nameInput = parent.querySelector('#tache_nom')
        this.descriptionInput = parent.querySelector('#tache_description')
        this.createdAt = parent.querySelector("#tache_created")
        this.modifiedAt = parent.querySelector("#tache_modified")
        
        this.nameInput.addEventListener('change', e => this.task.name = e.currentTarget.value)
        this.descriptionInput.addEventListener('change', e => this.task.description = e.currentTarget.value)

        this.tachesParent = parent.querySelector('#lb-taches')
        this.taches = this.tachesParent.querySelector('.taches')
        this.tachesCompteur = parent.querySelector("#lb-taches-compteur")
        this.buttonAjout = parent.querySelector("#lb-taches-ajout")

        this.buttonAjout.onclick = () => this.createNewSubTask()

        this.readonly = false
        this.addWatchers()

        this.subtasksVM = []
    }

    update(){
        this.updateId()
        this.updateName()
        this.updateDescription()
        this.updateFinished()
        this.updateDates()
        this.updateSubtasks()
    }
    
    updateId(){
        this.title.innerText = `Tâche #${this.task.id}`
    }

    updateName(){
        this.nameInput.value = this.task.name
    }

    updateDescription(){
        this.descriptionInput.value = this.task.description
    }

    updateFinished(){
        this.checkbox.checked = this.task.finished
        this.date.innerText = this.task.canShowDate ? 
            `Fini le ${dateToText(this.task.finishedAt)}` : ''
    }

    updateDates(){
        this.createdAt.innerText = dateToText(this.task.createdAt)
        this.modifiedAt.innerText = dateToText(this.task.modifiedAt)
    }

    updateSubtasks(){
        this.taches.innerHTML = ''
        this.subtasksVM.length = 0

        this.task.subtasks.forEach(t => this.addSubtaskVM(t))

        this.tachesCompteur.innerText = `(${this.task.subtasks.length})`
    }

    addSubtaskVM(subtask){
        let vm = new SubTaskVM(this.taches, subtask)
        this.subtasksVM.push(vm)

        vm.setReadOnly(this.readonly)
        vm.update()
    }

    createNewSubTask(){
        let subtask = Watcher.toWatcherProxy(new SubTask(this.task))
        this.task.subtasks.push(subtask)
        subtask.id = `${this.task.id}.${this.task.subtasks.length}`
        subtask.name = `Tâche ${subtask.id}`

        this.addSubtaskVM(subtask)
        this.taskVM.updateCounter()
    }

    setReadOnly(state){
        this.nameInput.toggleAttribute('readonly', state)
        this.descriptionInput.toggleAttribute('readonly', state)
        this.buttonAjout.classList.toggle('hide', state)

        this.subtasksVM.forEach(vm => vm.setReadOnly(state))
        this.readonly = state
    }

    addWatchers(){
        this.task.watcher.listen('name', 'lb', () => this.updateName())
        this.task.watcher.listen('description', 'lb', () => this.updateDescription())
        this.task.watcher.listen('finished', 'lb', () => this.updateFinished())
        this.task.watcher.listen('finishedAt', 'lb', () => this.updateFinished())
        this.task.watcher.listen('createdAt', 'lb', () => this.updateDates())
        this.task.watcher.listen('modifiedAt', 'lb', () => this.updateDates())
    }

}
//#endregion