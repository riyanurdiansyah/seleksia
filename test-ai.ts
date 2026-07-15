import { generateArticle } from "./lib/ai";

async function main() {
    try {
        const result = await generateArticle("buatkan saya artikel yang lagi viral tentang pesugihan gunung kawi", "gunung kawi, pesugihan, mistis", "Casual");
        console.log("Success:");
        console.log(result);
    } catch (error: any) {
        console.error("Error:");
        console.error(error.message);
    }
}

main();
