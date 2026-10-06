const router=require('express').Router(); const c=require('../controllers/actionController');
router.get('/meetings/:id/actions',c.list);router.post('/meetings/:id/actions',c.create);router.put('/actions/:id',c.update);router.delete('/actions/:id',c.remove);module.exports=router;
