import { exportGraphFiles } from "../data";

exportGraphFiles().then(() => {
    console.log('Files exported')
})
    .catch((err) => {
        console.log('Error exporting files')
        console.error(err)
    });