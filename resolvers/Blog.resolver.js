const { db } = require('../config/database');

const resolvers = {
    Query: {
        
        async publicacionesConComentarios() {
            return db.any(`
                SELECT 
                    p.pub_id,
                    p.pub_titulo,
                    a.aut_usuario,
                    c.com_descripcion
                FROM publicacion p
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                LEFT JOIN autor a ON c.aut_id = a.aut_id
                ORDER BY p.pub_id, c.com_id
            `);
        },

        async autoresConPublicaciones() {
            return db.any(`
                SELECT 
                    a.aut_usuario,
                    a.aut_nombre,
                    p.pub_titulo,
                    p.pub_descripcion
                FROM autor a
                LEFT JOIN publicacion p ON a.aut_id = p.aut_id
                ORDER BY a.aut_id, p.pub_id
            `);
        },

        async comentariosPorPublicacion(root, { pub_id }) {
            return db.any(`
                SELECT 
                    p.pub_id,
                    p.pub_titulo,
                    a.aut_usuario,
                    c.com_descripcion
                FROM publicacion p
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                LEFT JOIN autor a ON c.aut_id = a.aut_id
                WHERE p.pub_id = $1
                ORDER BY c.com_id
            `, [pub_id]);
        },

        async publicacionesConNumeroComentarios() {
            return db.any(`
                SELECT 
                    p.pub_titulo,
                    COUNT(c.com_id) AS numero_comentarios
                FROM publicacion p
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                GROUP BY p.pub_id, p.pub_titulo
                ORDER BY p.pub_id
            `);
        },

        async publicacionComentariosLikes(root, { pub_id }) {
            return db.any(`
                SELECT 
                    p.pub_titulo,
                    c.com_descripcion,
                    COUNT(CASE WHEN r.rea_like = true THEN 1 END) AS numero_likes
                FROM publicacion p
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                LEFT JOIN reaccion r ON c.com_id = r.com_id
                WHERE p.pub_id = $1
                GROUP BY p.pub_titulo, c.com_id, c.com_descripcion
                ORDER BY c.com_id
            `, [pub_id]);
        },

        async categoriasPublicacionesCompletas() {
            return db.any(`
                SELECT 
                    cat.cat_titulo AS categoria,
                    p.pub_titulo,
                    c.com_descripcion,
                    COUNT(CASE WHEN r.rea_like = true THEN 1 END) AS numero_likes,
                    COUNT(DISTINCT c.aut_id) AS numero_autores_comentarios
                FROM categoria cat
                LEFT JOIN publicacion p ON cat.cat_id = p.cat_id
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                LEFT JOIN reaccion r ON c.com_id = r.com_id
                GROUP BY cat.cat_titulo, p.pub_titulo, c.com_id, c.com_descripcion
                ORDER BY cat.cat_id, p.pub_id, c.com_id
            `);
        },

        async autoresEstadisticas() {
            return db.any(`
                SELECT 
                    a.aut_nombre,
                    cat.cat_titulo AS categoria,
                    COUNT(DISTINCT p.pub_id) AS numero_publicaciones,
                    COUNT(CASE WHEN r.rea_like = true THEN 1 END) AS numero_likes
                FROM autor a
                LEFT JOIN publicacion p ON a.aut_id = p.aut_id
                LEFT JOIN categoria cat ON p.cat_id = cat.cat_id
                LEFT JOIN comentario c ON p.pub_id = c.pub_id
                LEFT JOIN reaccion r ON c.com_id = r.com_id
                GROUP BY a.aut_id, a.aut_nombre, cat.cat_id, cat.cat_titulo
                ORDER BY a.aut_id, cat.cat_id
            `);
        },

        autores(root, { id }) {
            if (id === undefined) {
                return db.any('SELECT * FROM autor ORDER BY aut_id');
            } else {
                return db.any('SELECT * FROM autor WHERE aut_id = $1', [id]);
            }
        },

        categorias(root, { id }) {
            if (id === undefined) {
                return db.any('SELECT * FROM categoria ORDER BY cat_id');
            } else {
                return db.any('SELECT * FROM categoria WHERE cat_id = $1', [id]);
            }
        },

        publicaciones(root, { id }) {
            if (id === undefined) {
                return db.any('SELECT * FROM publicacion ORDER BY pub_id');
            } else {
                return db.any('SELECT * FROM publicacion WHERE pub_id = $1', [id]);
            }
        },

        comentarios(root, { id }) {
            if (id === undefined) {
                return db.any('SELECT * FROM comentario ORDER BY com_id');
            } else {
                return db.any('SELECT * FROM comentario WHERE com_id = $1', [id]);
            }
        }
    },

    publicacion: {
        async autor(publicacion) {
            const result = await db.oneOrNone('SELECT * FROM autor WHERE aut_id = $1', [publicacion.aut_id]);
            return result;
        },
        async categoria(publicacion) {
            const result = await db.oneOrNone('SELECT * FROM categoria WHERE cat_id = $1', [publicacion.cat_id]);
            return result;
        },
        async comentarios(publicacion) {
            return db.any('SELECT * FROM comentario WHERE pub_id = $1 ORDER BY com_id', [publicacion.pub_id]);
        }
    },

    comentario: {
        async autor(comentario) {
            const result = await db.oneOrNone('SELECT * FROM autor WHERE aut_id = $1', [comentario.aut_id]);
            return result;
        },
        async publicacion(comentario) {
            const result = await db.oneOrNone('SELECT * FROM publicacion WHERE pub_id = $1', [comentario.pub_id]);
            return result;
        },
        async reacciones(comentario) {
            return db.any('SELECT * FROM reaccion WHERE com_id = $1', [comentario.com_id]);
        },
        async numeroLikes(comentario) {
            const result = await db.one(
                'SELECT COUNT(*) as total FROM reaccion WHERE com_id = $1 AND rea_like = true',
                [comentario.com_id]
            );
            return parseInt(result.total);
        }
    },

    Mutation: {
        async crearComentario(root, { comentario }) {
            try {
                if (!comentario) {
                    return null;
                }

                const result = await db.one(
                    'INSERT INTO comentario (pub_id, aut_id, com_descripcion) VALUES ($1, $2, $3) RETURNING *',
                    [comentario.pub_id, comentario.aut_id, comentario.com_descripcion]
                );

                return result;
            } catch (error) {
                console.error('Error creando comentario:', error);
                throw new Error('Failed to create comentario');
            }
        },

        async actualizarComentario(root, { comentario }) {
            try {
                if (!comentario || comentario.com_id == null) {
                    console.error('com_id is missing in the input');
                    return null;
                }

                const result = await db.one(
                    `UPDATE comentario
                     SET pub_id = $1, aut_id = $2, com_descripcion = $3
                     WHERE com_id = $4
                     RETURNING *`,
                    [comentario.pub_id, comentario.aut_id, comentario.com_descripcion, comentario.com_id]
                );

                return result;
            } catch (error) {
                console.error('Error actualizando comentario:', error);
                throw new Error('Failed to update comentario');
            }
        },

        async eliminarComentario(root, { comentario }) {
            try {
                if (!comentario || comentario.com_id == null) {
                    console.error('com_id is missing in the input');
                    return null;
                }

                await db.none(
                    'DELETE FROM reaccion WHERE com_id = $1',
                    [comentario.com_id]
                );

                
                const result = await db.one(
                    'DELETE FROM comentario WHERE com_id = $1 RETURNING *',
                    [comentario.com_id]
                );

                return result;
            } catch (error) {
                console.error('Error eliminando comentario:', error);
                throw new Error('Failed to delete comentario');
            }
        },

        async crearPublicacion(root, { publicacion }) {
            try {
                if (!publicacion) {
                    return null;
                }

                const result = await db.one(
                    'INSERT INTO publicacion (cat_id, aut_id, pub_titulo, pub_descripcion) VALUES ($1, $2, $3, $4) RETURNING *',
                    [publicacion.cat_id, publicacion.aut_id, publicacion.pub_titulo, publicacion.pub_descripcion]
                );

                return result;
            } catch (error) {
                console.error('Error creando publicación:', error);
                throw new Error('Failed to create publicacion');
            }
        },

        async crearAutor(root, { autor }) {
            try {
                if (!autor) {
                    return null;
                }

                const result = await db.one(
                    'INSERT INTO autor (aut_usuario, aut_nombre) VALUES ($1, $2) RETURNING *',
                    [autor.aut_usuario, autor.aut_nombre]
                );

                return result;
            } catch (error) {
                console.error('Error creando autor:', error);
                throw new Error('Failed to create autor');
            }
        },

        async crearCategoria(root, { categoria }) {
            try {
                if (!categoria) {
                    return null;
                }

                const result = await db.one(
                    'INSERT INTO categoria (cat_titulo) VALUES ($1) RETURNING *',
                    [categoria.cat_titulo]
                );

                return result;
            } catch (error) {
                console.error('Error creando categoría:', error);
                throw new Error('Failed to create categoria');
            }
        }
    }
};

module.exports = resolvers;