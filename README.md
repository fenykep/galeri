# galeri
A repo for the website of a small art gallery.

Build with
`docker-compose build`

and bring up with
`docker-compose up`

Until I implemment a proxy, the admin page will be exposed on `localhost:3001/admin` and the actual page on `localhost:3000/index`.

Also until now the DB takes a lot longer to boot up and if the webservers try to access it before it's fully up everythimg will just crash. I'll handle these cases soon. And by default the /volumes/site/exibs and /events directories are not created automatically, so you might have to `mkdir volumes/site/exibs` manually.

By default the site uses a placeholder index.html and the actual page is generated at either the first time you upload an event/exhibition or just pinging the server with an empty get request @localhost:3001/generalj
