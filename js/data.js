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
        newProject.images = [...this.images]
        newProject.tasks = this.tasks.map(t => t.clone())
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
            tags: this.tags,
        }
    }

    static fromJSON(json){
        let project = new Project()
        project.title = json.title
        project.description = json.description
        project.createdAt = json.createdAt
        project.modifiedAt = json.modifiedAt
        project.images = [...json.images]
        project.tags = new Set(json.tags)
        project.tasks = json.tasks.map(tJson => Task.fromJSON(tJson, project))

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
//#endregion

// let fake_tags = {
//     1:new Tag(1, "Unity", "black"),
//     2:new Tag(2, "C#", "green"),
//     3:new Tag(3, "Networking", "dodgerblue"),
//     4:new Tag(4, "Maths", "darkorange"),
// }

// async function createTag(name, color){
//     let id = Object.keys(fake_tags).length
//     let newTag = new Tag(id, name, color)
//     fake_tags[id] = newTag
//     return newTag
// }

// async function editTag(id, name, color){
//     fake_tags[id] = new Tag(id, name, color)
//     return fake_tags[id]
// }

// async function getTags(){
//     return fake_tags
// }

// async function getProject(){
//     let project = new Project()
//     project.title = "FPS Multijoueur Unity"
//     project.description = "Ceci est la description du projet Unity.\nUne deuxième ligne ici."
//     project.createdAt = new Date(2024, 3, 25, 16, 34)
//     project.modifiedAt = new Date(2024, 3, 27, 10, 34)
//     project.images.push("https://unity.com/sites/default/files/styles/810_scale_width/public/2023-01/8-5%20GraphicsBuffersTower%20VFX.jpg?itok=FXoowMCi")
//     project.images.push("https://docs.blender.org/manual/en/latest/_images/modeling_meshes_primitives_all.png")

//     // Fake tags
//     project.tags.add(1)
//     project.tags.add(2)
//     project.tags.add(3)

//     // Fake tasks
//     let task = new Task(project)
//     task.id = 1
//     task.name = "Créer le projet Unity"
//     task.description = "Description 1"
//     task.createdAt = new Date(2024, 3, 25, 17, 10)
//     task.modifiedAt = new Date(2024, 3, 28, 10, 3)
//     task.finished = true
//     task.finishedAt = new Date(2024, 3, 28, 11, 2)
//     project.tasks.push(task)

//     let subtask = new SubTask(task)
//     subtask.id = "1.1"
//     subtask.name = "Installer Unity (dernière version)"
//     subtask.createdAt = new Date(2024, 3, 25, 17, 10)
//     subtask.modifiedAt = new Date(2024, 3, 28, 10, 3)
//     subtask.finished = true
//     task.subtasks.push(subtask)

//     subtask = new SubTask(task)
//     subtask.id = "1.2"
//     subtask.name = "Créer le projet"
//     subtask.createdAt = new Date(2024, 3, 25, 17, 12)
//     subtask.modifiedAt = new Date(2024, 3, 28, 10, 5)
//     subtask.finished = true
//     task.subtasks.push(subtask)

//     task = new Task(project)
//     task.id = 2
//     task.name = "Modéliser et animer les personnages et ennemis"
//     task.description = "Description 2"
//     task.createdAt = new Date(2024, 3, 26, 12, 10)
//     task.modifiedAt = new Date(2024, 3, 28, 9, 5)
//     task.finished = false
//     project.tasks.push(task)

//     task = new Task(project)
//     task.id = 3
//     task.name = "Programmer le CharacterController"
//     task.description = "Description 3"
//     task.createdAt = new Date(2024, 3, 26, 12, 10)
//     task.modifiedAt = new Date(2024, 3, 28, 9, 5)
//     task.finished = false
//     project.tasks.push(task)

//     return project
// }