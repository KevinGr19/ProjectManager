page_loads["searchpage"] = (args) => {
    let projects = null

    const d_searchResults = container.querySelector("#search-results")

    function createProjectResult(id, value){
        let d_card = d_searchResults.create('div.preview-card')

        let d_imageMask = d_card.create('div.image-mask')
        let t_title = d_card.create('p.title')
        let d_tags = d_card.create('div.etiquettes.c')

        let img = d_imageMask.create('img')
        t_title.innerText = value.title
        value.tags.forEach(tagId => {
            let tag = tags.get(tagId)
            let d_tag = d_tags.create("div.etiquette")

            d_tag.innerText = tag.name
            d_tag.style.backgroundColor = tag.color
        })

        d_card.addEventListener('click', () => navigateTo("projectpage", {projectId: id}))
    }

    async function updateResults(){
        projects = await getProjects()
        tags = await getTags()

        d_searchResults.innerHTML = ''
        projects.forEach((value, key) => createProjectResult(key, value))
    }

    updateResults()
}