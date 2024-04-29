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

    let subtask = new SubTask(task)
    subtask.id = "1.1"
    subtask.name = "Installer Unity (dernière version)"
    subtask.createdAt = new Date(2024, 3, 25, 17, 10)
    subtask.modifiedAt = new Date(2024, 3, 28, 10, 3)
    subtask.finished = true
    subtask.finishedAt = new Date(2024, 3, 28, 11, 2)

    task = new Task(project)
    task.id = 2
    task.name = "Modéliser et animer les personnages et ennemis"
    task.description = "Description 2"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false

    task = new Task(project)
    task.id = 3
    task.name = "Programmer le CharacterController"
    task.description = "Description 3"
    task.createdAt = new Date(2024, 3, 26, 12, 10)
    task.modifiedAt = new Date(2024, 3, 28, 9, 5)
    task.finished = false

    return project
}

page_loads["projectpage"] = () => {

    let project = generateFakeProject()

    function setupData(){
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
        taskVM.root.addEventListener('click', () => loadTask(task))
    }

    function clearTasksVM(){
        tasksVM.length = 0
        d_taches.innerHTML = ''
    }

    function updateLightboxVM(){
        if(taskLbVM){
            let task = project.tasks.find(t => t.id == taskLbVM.id)
            if(task) createLightbox(task)
            else taskLbVM = null
        }
    }

    function createLightbox(task){
        taskLbVM = new TaskLightboxVM(lightbox, task)
        task.subtasks.forEach(t => listenTask(t))
        taskLbVM.update()
        taskLbVM.setReadOnly(!editMode)
    }

    function loadTask(task){
        loadLightbox("task-lightbox")
        createLightbox(task)
    }
    //#endregion

    //#region Wiring up
    const d_projectEtiquettes = document.querySelector("#etiquettes-projet")
    const d_progressbar = document.querySelector("#progressbar")
    const d_progressbarFill = d_progressbar.querySelector("span")
    const t_progressbar = document.querySelector("#text-progressbar")
    const d_taches = document.querySelector("#taches-projet")
    
    
    
    function updateProgressbar(){
        let ratio = project.getRatio()
        if(ratio === null){
            d_progressbar.classList.add('hide')
        }
        else{
            d_progressbar.classList.remove('hide')
            
            let percentage = Math.round(ratio * 100)
            t_progressbar.innerText = d_progressbarFill.style.width = `${percentage}%`
        }
    }
    
    function updateProject(){
        setupData()
        createProjectVM()
        
        d_projectEtiquettes.innerHTML = ''
        if(project.tags){
            project.tags.forEach(t => d_projectEtiquettes.appendChild(t.toHTML()))
        }
        else{
            d_projectEtiquettes.innerText = 'Aucune'
        }

        clearTasksVM()
        project.tasks.forEach(t => addTaskVM(t))

        updateLightboxVM()
        
        updateProgressbar()
    }
    
    //#endregion
    
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
    
    async function saveAll(){
        let modifiedAt = new Date()

        project.modifiedAt = modifiedAt
        
        updateProject()
        setEditMode(0)
    }
    
    edit_button.addEventListener('click', () => setEditMode(true))
    cancel_button.addEventListener('click', () => setEditMode(false))
    save_button.addEventListener('click', () => saveAll())
    
    setEditMode(false)
    floating_button.classList.remove('hide')
    //#endregion

    updateProject()
}