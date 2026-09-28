import { createAppServerKit, createSessionRouteHandler } from "@circle-fin/app-kit/server"; 

const server = createAppServerKit({ 
  onramp: { 
    apiKey: process.env.ARC_API_KEY!, 
    referrerDomain: "arcterminalai.xyz", 
  }, 
}); 

export const POST = createSessionRouteHandler(server.onramp);
