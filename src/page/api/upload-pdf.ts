import type { NextApiRequest, NextApiResponse } from 'next';
import pdfParse from 'pdf-parse';
import Busboy from 'busboy';

    //Disable body parser for pdf uploads
    export const config = {
        api: {
            bodyParser: false,
        },
    };
    export default async function handler(req:NextApiRequest, res:NextApiResponse) {
        if(req.method !== 'POST') {
            return res.status(405).json({message: 'Method not allowed'});
        }
    //Parse incoming pdf file
    const bb = Busboy({headers: req.headers});
    const pdfBuffer: Buffer[] = [];

    bb.on('file', (fieldname: string, file: NodeJS.ReadableStream) => {
        file.on('data', (data: Buffer) => {
            pdfBuffer.push(data);
        });
    });

    bb.on('finish', async () => {
        const buffer = Buffer.concat(pdfBuffer);
        try {
          const data = await pdfParse(buffer);
          // For now, just return the raw text
          res.status(200).json({ text: data.text });
        } catch {
          res.status(500).json({ error: 'Failed to parse PDF' });
        }
      });
    
      req.pipe(bb);
    }