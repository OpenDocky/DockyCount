import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <Card className="bg-card/50 backdrop-blur-md border-border max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold text-center mb-4">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-center text-gray-300">
                        For security reasons, please contact us directly by email at:<br />
                        <span className="font-semibold text-white">dockyhost@gmail.com</span>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
