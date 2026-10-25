import { imageAliasPaths } from '../../../lib/image-aliases';
export { GET } from '../../../lib/image-aliases';
export const getStaticPaths = () => imageAliasPaths('png');
