//#region Data utils
class Watcher{

    constructor(object){
        this.object = object
        this.handlers = {}
    }

    static toWatcherProxy(object){
        if(object.watcher) return object
        object.watcher = new Watcher(object)

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

    removeListeners(listener_id){
        for(let handlers of Object.values(this.handlers)) delete handlers[listener_id]
    }

    trigger(prop){
        this.call(prop, this.object[prop])
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
    }

    getDoneTasks(){
        return this.tasks.reduce((p,c) => c.finished ? p+1 : p, 0)
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
        
        let text = element.create('p')
        text.innerText = this.name

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
    }

    get canShowDate(){
        return (this.finished && this.finishedAt);
    }

    isModified(oldTask){
        return this.id != oldTask.id
            || this.name != oldTask.id
    }

    processChanges(oldTask){
        if(!oldTask){
            this.createdAt = new Date()
            this.modifiedAt = new Date()
        }

        else {
            if(!oldTask.finished && this.finished) this.finishedAt = new Date()
            else if(oldTask.finished && !this.finished) this.finishedAt = null

            if(this.isModified(oldTask))
                this.modifiedAt = new Date()
        }
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

    isModified(oldTask){
        return super.isModified(oldTask)
            || this.description != oldTask.description
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

function generateFakeProject(){
    let project = new Project()
    project.title = "FPS Multijoueur Unity"
    project.description = "Ceci est la description du projet Unity.\nUne deuxième ligne ici."
    project.createdAt = new Date(2024, 3, 25, 16, 34)
    project.modifiedAt = new Date(2024, 3, 27, 10, 34)
    project.images.push("https://unity.com/sites/default/files/styles/810_scale_width/public/2023-01/8-5%20GraphicsBuffersTower%20VFX.jpg?itok=FXoowMCi")
    project.images.push("https://docs.blender.org/manual/en/latest/_images/modeling_meshes_primitives_all.png")

    // Fake tags
    project.tags.push(new Tag("Unity", "black"))
    project.tags.push(new Tag("C#", "green"))
    project.tags.push(new Tag("Networking", "dodgerblue"))
    project.tags.push(new Tag("Maths", "darkorange"))

    // Fake tasks
    let task = new Task(project)
    task.id = 1
    task.name = "Créer le projet Unity"
    task.description = "Description 1"
    task.createdAt = new Date(2024, 3, 25, 17, 10)
    task.modifiedAt = new Date(2024, 3, 28, 10, 3)
    task.finished = true
    task.finishedAt = new Date(2024, 3, 28, 11, 2)
    project.tasks.push(task)

    let subtask = new SubTask(task)
    subtask.id = "1.1"
    subtask.name = "Installer Unity (dernière version)"
    subtask.createdAt = new Date(2024, 3, 25, 17, 10)
    subtask.modifiedAt = new Date(2024, 3, 28, 10, 3)
    subtask.finished = true
    task.subtasks.push(subtask)

    subtask = new SubTask(task)
    subtask.id = "1.2"
    subtask.name = "Créer le projet"
    subtask.createdAt = new Date(2024, 3, 25, 17, 12)
    subtask.modifiedAt = new Date(2024, 3, 28, 10, 5)
    subtask.finished = true
    task.subtasks.push(subtask)

    task = new Task(project)
    task.id = 2
    task.name = "Modéliser et animer les personnages et ennemis"
    task.description = "Description 2"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false
    project.tasks.push(task)

    task = new Task(project)
    task.id = 3
    task.name = "Programmer le CharacterController"
    task.description = "Description 3"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false
    project.tasks.push(task)

    return project
}