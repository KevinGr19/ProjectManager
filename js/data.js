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
        this.tasks = []
        this.notes = []
        this.images = new Set()
        this.tags = new Set()
    }

    getDoneTasks(){
        return this.tasks.reduce((p,c) => c.finished ? p+1 : p, 0)
    }

    clone(){
        // TODO
        let newProject = new Project()
        newProject.title =  this.title
        newProject.description =  this.description
        newProject.createdAt =  this.createdAt
        newProject.modifiedAt =  this.modifiedAt
        newProject.images = new Set(this.images)
        newProject.tasks = this.tasks.map(t => t.clone())
        newProject.notes = this.notes.map(n => n.clone())
        newProject.tags = new Set(this.tags)

        return newProject
    }

    toJSON(){
        return {
            title: this.title,
            description: this.description,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt,
            images: this.images,
            tasks: this.tasks.map(t => t.toJSON()),
            notes: this.notes.map(n => n.toJSON()),
            tags: this.tags,
        }
    }

    static fromJSON(json){
        let project = new Project()
        project.title = json.title
        project.description = json.description
        project.createdAt = json.createdAt
        project.modifiedAt = json.modifiedAt
        project.images = new Set(json.images)
        project.tags = new Set(json.tags)
        project.tasks = json.tasks.map(tJson => Task.fromJSON(tJson, project))
        project.notes = json.notes.map(nJson => Note.fromJSON(nJson, project))

        return project
    }

}

class Tag{

    constructor(id, name, color){
        this.id = id
        this.name = name
        this.color = color
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
        return this.name != oldTask.name
    }

    processChanges(oldTask){
        if(!oldTask){
            this.createdAt = new Date()
            this.modifiedAt = new Date()

            if(this.finished) this.finishedAt = new Date()
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
            || this.subtasks.length != oldTask.subtasks.length
            || this.subtasks.find((t,i) => t.id != oldTask.subtasks[i].id)
    }

    toJSON(){
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt,
            finished: this.finished,
            finishedAt: this.finishedAt,
            description: this.description,
            subtasks: this.subtasks.map(t => t.toJSON()),
        }
    }

    static fromJSON(json, project){
        let task = new Task(project)
        task.id = json.id
        task.name = json.name
        task.description = json.description
        task.createdAt = json.createdAt
        task.modifiedAt = json.modifiedAt
        task.finished = json.finished
        task.finishedAt = json.finishedAt
        task.subtasks = json.subtasks.map(tJson => SubTask.fromJSON(tJson, task))

        return task
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

    toJSON(){
        return {
            id: this.id,
            name: this.name,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt,
            finished: this.finished,
            finishedAt: this.finishedAt,
        }
    }

    static fromJSON(json, task){
        let subtask = new SubTask(task)
        subtask.id = json.id
        subtask.name = json.name
        subtask.createdAt = json.createdAt
        subtask.modifiedAt = json.modifiedAt
        subtask.finished = json.finished
        subtask.finishedAt = json.finishedAt

        return subtask
    }

}

class Note{

    constructor(project){
        this.project = project

        this.id = null
        this.title = ""
        this.description = ""
        this.createdAt = null
        this.modifiedAt = null
        this.images = new Set()
    }

    clone(){
        let newNote = new Note(this.project)
        newNote.id = this.id
        newNote.title = this.title
        newNote.description = this.description
        newNote.createdAt = this.createdAt
        newNote.modifiedAt = this.modifiedAt
        newNote.images = new Set(this.images)

        return newNote
    }

    toJSON(){
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt,
            images: this.images,
        }
    }

    static fromJSON(json, project){
        let newNote = new Note(project)
        newNote.id = json.id
        newNote.title = json.title
        newNote.description = json.description
        newNote.createdAt = json.createdAt
        newNote.modifiedAt = json.modifiedAt
        newNote.images = new Set(json.images)

        return newNote
    }

    isModified(oldNote){
        return this.title != oldNote.title
            || this.description != oldNote.description
            || this.images.length != oldNote.length
            || ![...this.images].every(x => oldNote.images.has(x))
    }

    processChanges(oldNote){
        if(!oldNote){
            this.createdAt = new Date()
            this.modifiedAt = new Date()
        }

        else if(this.isModified(oldNote)){
            this.modifiedAt = new Date()
        }
    }

}
//#endregion