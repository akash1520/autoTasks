import { Response, Router } from 'express';
import path from "path"

const router: Router = Router();



router.get('/', (res:Response) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { router };
