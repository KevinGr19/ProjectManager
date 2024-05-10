page_loads["searchpage"] = (args) => {

    let projects = null
    let projectIcons = new Map()

    class ProjectIconVM{

        #id = null

        constructor(root){
            this.root = root.create('div.preview-card')
            this.d_imageMask = this.root.create('div.image-mask')
            this.t_title = this.root.create('p.title')
            this.d_tags = this.root.create('div.etiquettes.c')

            this.img = this.d_imageMask.create('img')  

            this.root.addEventListener('click', () => {
                if(this.id) navigateTo("projectpage", {projectId: this.id})
            })

            this.root.addEventListener('contextmenu', (e) => {
                e.preventDefault()
                openContextMenu(e.clientX, e.clientY, [
                    {
                        label: "Supprimer le projet",
                        action: () => this.askDelete()
                    }
                ])
            })

            this.tagsVM = []

            this.match = true
        }

        get id() { return this.#id }
        set id(value){
            this.#id = value
            this.updateAll()
        }

        get project(){
            return this.id ? projects.get(this.id) : null
        }

        //#region Update
        updateTitle(){
            this.t_title.innerText = this.project.title
        }

        updateTags(){
            this.tagsVM.length = 0
            this.d_tags.innerHTML = ''
            
            this.project.tags.forEach(tagId => {
                let tagVM = new TagVM(this.d_tags)
                this.tagsVM.push(tagVM)

                tagVM.tagId = tagId
                tagVM.update()
            })
        }

        updateAll(){
            this.updateTitle()
            this.updateTags()
        }
        //#endregion

        askDelete(){
            if(!this.id) return
            let fixedId = this.id

            deleteConfirmation(PROJECT_DELETE_MSG.format(this.project.title),
                () => { deleteProject(fixedId).then(() => this.deleteFromPage()) })
        }

        deleteFromPage(){
            this.root.remove()
            projectIcons.delete(this.id)

            filterResults()
        }

        filter(value){
            this.match = this.project.title.toLowerCase().startsWith(value.toLowerCase())
            this.match &= !selectedTags.size || [...selectedTags].every(tagId => this.project.tags.has(tagId))
            this.root.classList.toggle('hide', !this.match)
            return this.match
        }
    }

    function createProjectLB(){
        loadLightbox("create-project", {
            onOpen: () => {
                const i_titre = lightbox.querySelector("#lb-create-project-name")
                const b_create = lightbox.querySelector("#lb-create-project-new")

                b_create.addEventListener('click', () => {
                    let project = new Project()
                    project.title = i_titre.value

                    b_create.disabled = true
                    saveProject(project.toJSON())
                        .then(res => navigateTo("projectpage", {projectId: res}))
                        .catch(err => {
                            b_create.disabled = false
                        })
                })
            },
            backClose: true
        })
    }

    function buildFilterTags(){
        d_tagsFilter.innerHTML = ''
        filterTagsVM.length = 0

        tags.keys().forEach(tagId => {
            let tagVM = new TagVM(d_tagsFilter)
            filterTagsVM.push(tagVM)

            tagVM.tagId = tagId
            tagVM.update()
            updateTagSelection(tagVM)

            tagVM.root.classList.add('clickable')
            tagVM.root.addEventListener('click', () => toggleFilterTag(tagVM.tagId))
        })
    }

    function updateFilterTags(){
        filterTagsVM.forEach(vm => updateTagSelection(vm))
        t_filterTagsCounter.innerText = `${selectedTags.size}/${filterTagsVM.length}`
    }

    function updateTagSelection(tagVM){
        tagVM.root.toggleAttribute('disabled', selectedTags.size && !selectedTags.has(tagVM.tagId))
    }

    function toggleFilterTag(tagId){
        if(!selectedTags.delete(tagId)) selectedTags.add(tagId)
        updateFilterTags()
        filterResults()
    }

    function filterResults(){
        let results = 0
        projectIcons.values().forEach(icon => results += icon.filter(i_searchBar.value) ? 1 : 0)

        t_resultCounter.innerText = `${results} résultats`
    }

    async function updateResults(){
        projects = await getProjects()
        await refreshTags()

        d_searchResults.innerHTML = ''
        projects.keys().forEach(projId => {
            if(!projectIcons.has(projId)){
                let projVM = new ProjectIconVM(d_searchResults)
                projectIcons.set(projId, projVM)
                projVM.id = projId
            }
            else projectIcons.get(projId).updateAll()
        })
    }

    function updateFilterTagsVisibility(){
        d_tagsFilterHeader.classList.toggle('open', filterTagsOpen)
        d_tagsFilter.classList.toggle('hide', !filterTagsOpen)
    }

    let filterTagsOpen = false
    
    const d_tagsFilter = container.querySelector("#tags-filter")
    const d_tagsFilterHeader = container.querySelector("#tags-filter-header")
    const t_filterTagsCounter = container.querySelector("#tags-filter-counter")
    
    const i_searchBar = container.querySelector("#search-bar")
    const b_resetFilters = container.querySelector("#reset-filters")

    const d_searchResults = container.querySelector("#search-results")
    const t_resultCounter = container.querySelector("#project-counter")

    const filterTagsVM = []
    const selectedTags = new Set()

    d_tagsFilterHeader.addEventListener('click', () => {
        filterTagsOpen = !filterTagsOpen
        updateFilterTagsVisibility()
    })

    i_searchBar.addEventListener('keydown', e => {
        setTimeout(() => filterResults(), 1)
    })

    b_resetFilters.addEventListener('click', () => {
        i_searchBar.value = ""
        selectedTags.clear()

        updateFilterTags()
        filterResults()
    })

    const b_newProject = container.querySelector("#button-create-project")
    b_newProject.addEventListener('click', () => createProjectLB())

    pageEvents["tagsrefreshed"] = () => {
        selectedTags.forEach(tagId => {
            if(!tags.has(tagId)) selectedTags.delete(tagId)
        })

        buildFilterTags()
        updateFilterTags()
        filterResults()
        projectIcons.values().forEach(vm => vm.updateTags())
    }

    updateFilterTagsVisibility()
    updateResults().then(() => filterResults())
}