from mozilla_django_oidc.auth import OIDCAuthenticationBackend
                                                                   
class MyOIDCAuthenticationBackend(OIDCAuthenticationBackend):              
    def update_user(self, user, claims):
        print("Received claims:", claims)  # Debug print

        user.first_name = claims.get('given_name', '')
        user.last_name = claims.get('family_name', '')
        user.email = claims.get('email', '')

        user.save()
        return user







