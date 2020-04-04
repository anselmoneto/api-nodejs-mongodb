const express = require('express');
const authMiddleware = require('../middlewares/auth');
const Project = require('../models/project');
const Task = require('../models/task');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {

    try {

        const projects = await Project.find().populate(['user', 'tasks']);

        return res.send({ projects });

    } catch (err) {
        return res.status(400).send({ error: 'List projects failed' });
    }
});

router.get('/:projectId', async (req, res) => {

    try {

        const project = await Project.findById(req.params.projectId).populate(['user', 'tasks']);

        return res.send({ project });

    } catch (err) {
        return res.status(400).send({ error: 'Get project failed' });
    }
});

router.post('/', async (req, res) => {

    try {
        const { title, description, tasks } = req.body;
        const project = await Project.create({ title, description, user: req.userId });

        // tasks.map(task => {
        //     const projectTask = new Task({ ...task, project: project._id });

        //     projectTask.save().then(task => {
        //         project.tasks.push(task);
        //     });
        // });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();
            project.tasks.push(projectTask);
        }));

        await project.save();

        return res.send({ project });

    } catch (err) {
        return res.status(400).send({ error: 'Create project failed' });
    }
});

router.put('/:projectId', async (req, res) => {

    try {

        const { title, description, tasks } = req.body;
        const project = await Project.findByIdAndUpdate(req.params.projectId, { title, description }, { new: true });

        project.tasks = [];
        await Task.remove({ project: project._id });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id });

            await projectTask.save();
            project.tasks.push(projectTask);
        }));

        await project.save();

        return res.send({ project });

    } catch (err) {
        return res.status(400).send({ error: 'Update project failed' });
    }
});

router.delete('/:projectId', async (req, res) => {

    try {

        await Project.findByIdAndRemove(req.params.projectId);
        return res.send();

    } catch (err) {
        return res.status(400).send({ error: 'Delete project failed' });
    }
});

router.post('/register', async (req, res) => {
    const { email } = req.body;

    try {
        if (await User.findOne({ email }))
            return res.status(400).send({ error: 'User already exists' });

        const user = await User.create(req.body);

        user.password = undefined;
        return res.send({ user, token: generateToken({ id: user.id }) });

    } catch (err) {
        return res.status(400).send({ error: 'Registration failed' });
    }
});

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).send({ error: 'User not found' });
        }

        if (!await bcrypt.compare(password, user.password)) {
            return res.status(400).send({ error: 'Invalid password' });
        }

        user.password = undefined;
        return res.send({ user, token: generateToken({ id: user.id }) });

    } catch (err) {
        return res.status(400).send({ error: 'Registration failed' });
    }
});

module.exports = app => app.use('/projects', router);