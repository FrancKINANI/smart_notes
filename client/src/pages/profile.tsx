import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  User,
  Key,
  Mail,
  UserCircle,
  FileEdit,
  Save,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest(`/api/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Erreur lors de la mise à jour du profil"
        );
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
      setIsEditing(false);
      refetchUser();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour changer le mot de passe
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const res = await apiRequest(`/api/users/${user?.id}/password`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Erreur lors du changement de mot de passe"
        );
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Mot de passe changé",
        description: "Votre mot de passe a été modifié avec succès",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les nouveaux mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  if (!user) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTitle>Non autorisé</AlertTitle>
          <AlertDescription>
            Vous devez être connecté pour accéder à cette page
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="outline" size="icon" className="mr-4">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar || ""} />
                  <AvatarFallback className="text-2xl">
                    {(user.displayName || user.username)
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">
                    {user.displayName || user.username}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsEditing(true)}
                  >
                    <FileEdit className="mr-2 h-4 w-4" />
                    Modifier le profil
                  </Button>
                )}
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    Membre depuis{" "}
                    {new Date().toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className="flex items-center">
                  <UserCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    Rôle:{" "}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="informations">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="informations" className="flex-1">
                <User className="h-4 w-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="securite" className="flex-1">
                <Key className="h-4 w-4 mr-2" />
                Sécurité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="informations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Informations personnelles</span>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditing(false)}
                      >
                        Annuler
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Gérez vos informations personnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Nom d'affichage</Label>
                          <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                displayName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Nom d'utilisateur</Label>
                          <Input id="username" value={user.username} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Prénom</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                firstName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Nom</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                lastName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" value={user.email} disabled />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="bio">Biographie</Label>
                          <Input
                            id="bio"
                            value={formData.bio}
                            onChange={(e) =>
                              setFormData({ ...formData, bio: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full mt-4"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer les modifications
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Nom d'affichage
                          </h3>
                          <p>{user.displayName || "-"}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Nom d'utilisateur
                          </h3>
                          <p>{user.username}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Prénom
                          </h3>
                          <p>{user.firstName || "-"}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Nom
                          </h3>
                          <p>{user.lastName || "-"}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            Email
                          </h3>
                          <p className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                            {user.email}
                          </p>
                        </div>
                        {user.bio && (
                          <div className="sm:col-span-2">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">
                              Biographie
                            </h3>
                            <p>{user.bio}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="securite">
              <Card>
                <CardHeader>
                  <CardTitle>Sécurité du compte</CardTitle>
                  <CardDescription>
                    Gérez votre mot de passe et la sécurité de votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        Mot de passe actuel
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirmer le nouveau mot de passe
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full mt-4"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        "Changer le mot de passe"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
