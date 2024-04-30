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

page_loads["projectpage"] = () => {

    let original_project = generateFakeProject()
    let project = null

    function setupData(){
        project = original_project.clone()
        project = Watcher.toWatcherProxy(project)

        for(let i in project.tasks){
            let task = project.tasks[i]
            project.tasks[i] = Watcher.toWatcherProxy(task)

            for(let j in task.subtasks){
                task.subtasks[j] = Watcher.toWatcherProxy(task.subtasks[j])
            }
        }
    }

    //#region VMs
    let projectVM = null
    let tasksVM = []
    let taskLbVM = null

    function listenTask(task){
        task.watcher.listen('finished', 'changenotifier', (_) => setEditMode(true))
    }

    function createProjectVM(){
        projectVM = new ProjectVM(container, project)
        projectVM.update()
        projectVM.setReadOnly(!editMode)
    }

    function addTaskVM(task){
        listenTask(task)
        
        let taskVM = new MainTaskVM(d_taches, task)
        tasksVM.push(taskVM)
        taskVM.update()
        taskVM.root.addEventListener('click', () => loadTask(taskVM))

        return taskVM
    }

    function clearTasksVM(){
        tasksVM.length = 0
        d_taches.innerHTML = ''
    }

    function updateLightboxVM(){
        if(taskLbVM){
            let taskVM = tasksVM.find(t => t.task.id == taskLbVM.id)
            if(taskVM) createLightbox(taskVM)
            else taskLbVM = null
        }
    }

    function createLightbox(taskVM){
        let task = taskVM.task

        taskLbVM = new TaskLightboxVM(lightbox, task, taskVM)
        task.subtasks.forEach(t => {
            listenTask(t)
            t.watcher.listen('finished', 'taskCompteur', (_) => taskVM.updateCounter())
        })

        taskLbVM.update()
        taskLbVM.setReadOnly(!editMode)
    }

    function loadTask(taskVM){
        loadLightbox("task-lightbox")
        createLightbox(taskVM)
    }

    function createNewTask(){
        if(!editMode) return
        
        let task = Watcher.toWatcherProxy(new Task(project))
        project.tasks.push(task)
        task.id = project.tasks.length
        task.name = `Tâche ${task.id}`

        let vm = addTaskVM(task)
        loadTask(vm)
    }
    //#endregion

    function updateProjectPage(){
        setupData()
        createProjectVM()

        clearTasksVM()
        project.tasks.forEach(t => addTaskVM(t))

        updateLightboxVM()
    }
    
    async function updateProject(){
        project.modifiedAt = new Date()
        original_project = project.clone()
    }
    
    //#region Floating buttons
    const floating_button = document.querySelector(".floating_button")
    const edit_button = floating_button.querySelector("#edit-button")
    const cancel_button = floating_button.querySelector("#cancel-button")
    const save_button = floating_button.querySelector("#save-button")
    
    let editMode = null
    
    function setEditMode(edit){
        if(edit == editMode) return
        editMode = edit
        
        edit_button.classList.toggle('hide', editMode)
        cancel_button.classList.toggle('hide', !editMode)
        save_button.classList.toggle('hide', !editMode)

        if(projectVM) projectVM.setReadOnly(!edit)
        if(taskLbVM) taskLbVM.setReadOnly(!edit)
    }

    function cancelChanges(){
        setEditMode(false)
        updateProjectPage()
    }
    
    function saveChanges(){
        updateProject().then(() => {
            setEditMode(false)
            updateProjectPage()
        })
    }
    
    edit_button.addEventListener('click', () => setEditMode(true))
    cancel_button.addEventListener('click', () => cancelChanges())
    save_button.addEventListener('click', () => saveChanges())
    //#endregion
    
    const b_ajoutTache = document.querySelector("#taches-ajout")
    b_ajoutTache.addEventListener('click', () => createNewTask())

    setEditMode(false)
    floating_button.classList.remove('hide')

    updateProject()
    updateProjectPage()
}