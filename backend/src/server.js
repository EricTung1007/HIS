const express = require('express');
const cors = require('cors');

require('./db'); // Initialize database

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/patients/:pid/history', require('./routes/history'));
app.use('/api/patients/:pid/medications', require('./routes/medications'));
app.use('/api/patients/:pid/mar', require('./routes/mar'));
app.use('/api/patients/:pid/io', require('./routes/intake-output'));
app.use('/api/patients/:pid/vitals', require('./routes/vital-signs'));
app.use('/api/patients/:pid/pe', require('./routes/physical-exam'));
app.use('/api/patients/:pid/notes', require('./routes/nursing-notes'));
app.use('/api/patients/:pid/ai', require('./routes/ai'));
app.use('/api/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', system: '台灣長照HIS系統' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HIS後端啟動於 http://localhost:${PORT}`));
