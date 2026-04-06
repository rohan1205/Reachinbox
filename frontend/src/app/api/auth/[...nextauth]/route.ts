import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    })
  ],
  callbacks: {
    async session({ session, token }) {
      // Send properties to the client
      if (session?.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: "/"
  }
})

export { handler as GET, handler as POST }
