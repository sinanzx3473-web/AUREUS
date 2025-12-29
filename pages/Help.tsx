import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, Book, MessageCircle, Mail, Github, FileText, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const Help = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const helpTopics = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of AUREUS and create your first profile",
      articles: [
        "How to connect your wallet",
        "Creating your skill profile",
        "Understanding skill claims",
        "Getting your first endorsement"
      ]
    },
    {
      icon: FileText,
      title: "Smart Contracts",
      description: "Understanding on-chain operations and contract interactions",
      articles: [
        "Contract deployment guide",
        "Upgrading contracts safely",
        "Understanding gas fees",
        "Contract verification on Etherscan"
      ]
    },
    {
      icon: MessageCircle,
      title: "API Integration",
      description: "Integrate AUREUS into your applications",
      articles: [
        "API authentication",
        "Rate limits and quotas",
        "Webhook notifications",
        "GraphQL queries"
      ]
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Step-by-step video guides for common tasks",
      articles: [
        "Platform walkthrough (5 min)",
        "Creating and claiming skills (3 min)",
        "Endorsement workflow (4 min)",
        "Developer integration (10 min)"
      ]
    }
  ];

  const quickLinks = [
    { label: "Documentation", path: "/docs", icon: Book },
    { label: "FAQ", path: "/faq", icon: HelpCircle },
    { label: "Security", path: "/security", icon: FileText },
    { label: "API Reference", path: "/docs", icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-black text-white">


      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-serif text-white tracking-tight">
            AUREUS
          </h1>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-5xl font-bold mb-4">Help Center</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Find answers, learn best practices, and get support
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search for help articles, guides, and tutorials..."
              className="pl-12 py-6 text-lg bg-gray-900 border-gray-700 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6 text-center">Quick Links</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <Card 
                key={index}
                className="bg-gray-900 border-gray-800 hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => navigate(link.path)}
              >
                <CardContent className="pt-6 text-center">
                  <link.icon className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                  <p className="font-semibold">{link.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Help Topics */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6">Browse by Topic</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {helpTopics.map((topic, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <topic.icon className="w-8 h-8 text-blue-400" />
                    <div>
                      <CardTitle className="text-xl">{topic.title}</CardTitle>
                      <CardDescription>{topic.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {topic.articles.map((article, articleIndex) => (
                      <li key={articleIndex}>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-gray-400 hover:text-blue-400 text-left"
                        >
                          {article}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Articles */}
        <Card className="bg-gray-900 border-gray-800 mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Popular Articles</CardTitle>
            <CardDescription>Most viewed help articles this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "How to connect MetaMask wallet", views: "2.4k", badge: "Trending" },
                { title: "Understanding gas fees and optimization", views: "1.8k", badge: "Popular" },
                { title: "Troubleshooting transaction failures", views: "1.5k", badge: null },
                { title: "API authentication with JWT tokens", views: "1.2k", badge: null },
                { title: "Deploying contracts to Polygon", views: "980", badge: "New" }
              ].map((article, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-black rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-semibold">{article.title}</p>
                      <p className="text-sm text-gray-400">{article.views} views</p>
                    </div>
                  </div>
                  {article.badge && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400">
                      {article.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <MessageCircle className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle>Community Discord</CardTitle>
              <CardDescription>Chat with the community and get help from other users</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://discord.gg/takumi', '_blank')}
              >
                Join Discord
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <Github className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle>GitHub Issues</CardTitle>
              <CardDescription>Report bugs and request features on GitHub</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://github.com/takumi-platform/issues', '_blank')}
              >
                Open Issue
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <Mail className="w-8 h-8 text-green-400 mb-2" />
              <CardTitle>Email Support</CardTitle>
              <CardDescription>Get personalized help from our support team</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = 'mailto:support@takumi.example.com'}
              >
                Email Us
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">System Status</CardTitle>
            <CardDescription>Current operational status of AUREUS services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { service: "Smart Contracts", status: "Operational", color: "green" },
                { service: "Backend API", status: "Operational", color: "green" },
                { service: "IPFS Storage", status: "Operational", color: "green" },
                { service: "Indexer Service", status: "Operational", color: "green" },
                { service: "Monitoring", status: "Operational", color: "green" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black rounded-lg">
                  <span className="font-semibold">{item.service}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${item.color}-400`}></div>
                    <span className="text-sm text-gray-400">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-4 p-0 text-blue-400">
              View detailed status →
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} AUREUS PROTOCOL. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};
