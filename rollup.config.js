import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';
import {glob} from 'glob';

const inputFiles = glob.sync('./src/*.ts'); // Adjust the pattern as needed
export default {
    input: inputFiles,
    output: {
        dir: 'public',
        format: 'esm',
        sourcemap: false,
    },
    plugins: [
        copy({
            targets: [
                {src: 'src/index.css', dest: 'public'},
                {src: 'src/property.css', dest: 'public'},
                {src: 'src/listing.css', dest: 'public'},
                {src: 'src/data.json', dest: 'public'}
            ],
            flatten: true,
            copyOnce: false 
        }),
        typescript({
            tsconfig: './tsconfig.json'
        }),
        nodeResolve(), // This plugin allows Rollup to resolve modules from node_modules
        commonjs() // Converts CommonJS modules to ES modules
    ]
}